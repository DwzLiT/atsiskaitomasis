-- Baseline: the database as it was set up by hand in the Supabase dashboard
-- (before migrations were kept in the repo). Already applied to the live
-- project; kept here so a fresh project can be rebuilt from the repo.

create extension if not exists pgcrypto;

-- Tradable symbols with their latest price (USD, from Alpha Vantage).
create table if not exists public.instruments (
  symbol     text primary key,
  company    text not null,
  price      numeric(14, 4) not null check (price > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

-- One trader per logged-in user. user_id is null only for old seed rows.
create table if not exists public.traders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users (id) on delete cascade,
  name         text not null,
  email        text not null unique,
  cash_balance numeric(14, 2) not null default 10000 check (cash_balance >= 0),
  created_at   timestamptz not null default now()
);

create table if not exists public.tickets (
  id         uuid primary key default gen_random_uuid(),
  trader_id  uuid not null references public.traders (id) on delete cascade,
  symbol     text not null references public.instruments (symbol),
  side       text not null check (side in ('BUY', 'SELL')),
  quantity   integer not null check (quantity > 0),
  price      numeric(14, 4) not null check (price > 0),
  status     text not null default 'FILLED' check (status in ('FILLED', 'REJECTED')),
  created_at timestamptz not null default now()
);
create index if not exists tickets_trader_created_idx
  on public.tickets (trader_id, created_at desc);

create table if not exists public.positions (
  trader_id uuid not null references public.traders (id) on delete cascade,
  symbol    text not null references public.instruments (symbol),
  shares    integer not null check (shares > 0),
  avg_cost  numeric(14, 4) not null,
  primary key (trader_id, symbol)
);

-- Row level security: users only see their own rows.
alter table public.instruments enable row level security;
alter table public.profiles    enable row level security;
alter table public.traders     enable row level security;
alter table public.tickets     enable row level security;
alter table public.positions   enable row level security;

create policy "Logged-in users view instruments" on public.instruments
  for select to authenticated using (true);

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users view own trader" on public.traders
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Users view own tickets" on public.tickets
  for select to authenticated using (
    trader_id in (select id from public.traders where user_id = (select auth.uid()))
  );

create policy "Users view own positions" on public.positions
  for select to authenticated using (
    trader_id in (select id from public.traders where user_id = (select auth.uid()))
  );

-- New auth user -> profile + trader with the 10 000 starting balance.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.traders (user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Adds or updates a stock price. Called by the browser after a quote.
create or replace function public.upsert_instrument(
  p_symbol  text,
  p_company text,
  p_price   numeric
) returns public.instruments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_symbol text := upper(trim(p_symbol));
  v_row public.instruments;
begin
  if auth.uid() is null then
    raise exception 'not logged in';
  end if;
  if v_symbol is null or v_symbol = '' then
    raise exception 'symbol is required';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception 'price must be positive';
  end if;

  insert into public.instruments (symbol, company, price, updated_at)
    values (v_symbol, coalesce(nullif(trim(p_company), ''), v_symbol), p_price, now())
  on conflict (symbol) do update
    set company = excluded.company,
        price = excluded.price,
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

-- BUY / SELL for the logged-in user at the instrument's current price.
-- The trader is looked up from auth.uid(), never passed in from the browser.
create or replace function public.place_ticket(
  p_symbol   text,
  p_side     text,
  p_quantity integer
) returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trader_id uuid;
  v_symbol text := upper(trim(p_symbol));
  v_side   text := upper(p_side);
  v_price  numeric;
  v_cost   numeric;
  v_cash   numeric;
  v_pos    public.positions;
  v_ticket public.tickets;
begin
  select id into v_trader_id from public.traders where user_id = auth.uid();
  if v_trader_id is null then
    raise exception 'not logged in or no trader account';
  end if;

  if v_side not in ('BUY', 'SELL') then
    raise exception 'side must be BUY or SELL';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be a positive integer';
  end if;

  select price into v_price from public.instruments where symbol = v_symbol;
  if v_price is null then
    raise exception 'unknown symbol %', v_symbol;
  end if;

  -- Lock the trader row so concurrent tickets are serialized.
  select cash_balance into v_cash from public.traders where id = v_trader_id for update;

  v_cost := round(v_price * p_quantity, 2);
  select * into v_pos from public.positions
    where trader_id = v_trader_id and symbol = v_symbol;

  if v_side = 'BUY' then
    if v_cost > v_cash then
      raise exception 'insufficient cash: need %, have %', v_cost, v_cash;
    end if;
    update public.traders set cash_balance = cash_balance - v_cost where id = v_trader_id;
    if v_pos.trader_id is null then
      insert into public.positions (trader_id, symbol, shares, avg_cost)
        values (v_trader_id, v_symbol, p_quantity, v_price);
    else
      update public.positions
        set avg_cost = (avg_cost * shares + v_price * p_quantity) / (shares + p_quantity),
            shares = shares + p_quantity
        where trader_id = v_trader_id and symbol = v_symbol;
    end if;
  else
    if v_pos.trader_id is null or v_pos.shares < p_quantity then
      raise exception 'insufficient shares: have %, want to sell %',
        coalesce(v_pos.shares, 0), p_quantity;
    end if;
    update public.traders set cash_balance = cash_balance + v_cost where id = v_trader_id;
    if v_pos.shares = p_quantity then
      delete from public.positions where trader_id = v_trader_id and symbol = v_symbol;
    else
      update public.positions set shares = shares - p_quantity
        where trader_id = v_trader_id and symbol = v_symbol;
    end if;
  end if;

  insert into public.tickets (trader_id, symbol, side, quantity, price)
    values (v_trader_id, v_symbol, v_side, p_quantity, v_price)
    returning * into v_ticket;
  return v_ticket;
end;
$$;

revoke execute on function public.upsert_instrument(text, text, numeric) from public, anon;
revoke execute on function public.place_ticket(text, text, integer) from public, anon;

-- Note: the live project also still has the older
-- place_ticket(p_trader_id uuid, ...) overload used by branch C's Express
-- server. It is intentionally left alone until that branch is retired.
