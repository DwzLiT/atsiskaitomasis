-- Trading platform schema (Supabase / Postgres).
-- Run once in the Supabase SQL editor, then `npm run seed`.

create extension if not exists pgcrypto;

-- Tradable symbols with their latest (virtual) price.
create table if not exists instruments (
  symbol     text primary key,
  company    text not null,
  price      numeric(14, 4) not null check (price > 0),
  updated_at timestamptz not null default now()
);

create table if not exists traders (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  cash_balance numeric(14, 2) not null default 10000 check (cash_balance >= 0),
  created_at   timestamptz not null default now()
);

-- A signed-in user can own several traders; the portfolio aggregates them.
alter table traders
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- One row per order ticket. A trader has many tickets.
create table if not exists tickets (
  id         uuid primary key default gen_random_uuid(),
  trader_id  uuid not null references traders (id) on delete cascade,
  symbol     text not null references instruments (symbol),
  side       text not null check (side in ('BUY', 'SELL')),
  quantity   integer not null check (quantity > 0),
  price      numeric(14, 4) not null check (price > 0),
  status     text not null default 'FILLED' check (status in ('FILLED', 'REJECTED')),
  created_at timestamptz not null default now()
);
create index if not exists tickets_trader_created_idx
  on tickets (trader_id, created_at desc);

-- Current holdings per trader, maintained by place_ticket().
create table if not exists positions (
  trader_id uuid not null references traders (id) on delete cascade,
  symbol    text not null references instruments (symbol),
  shares    integer not null check (shares > 0),
  avg_cost  numeric(14, 4) not null,
  primary key (trader_id, symbol)
);

-- Executes a BUY/SELL ticket atomically at the instrument's current price.
-- Raises an exception (and writes nothing) on unknown symbol, insufficient
-- cash or insufficient shares.
create or replace function place_ticket(
  p_trader_id uuid,
  p_symbol    text,
  p_side      text,
  p_quantity  integer
) returns tickets
language plpgsql
as $$
declare
  v_symbol text := upper(trim(p_symbol));
  v_side   text := upper(p_side);
  v_price  numeric;
  v_cost   numeric;
  v_cash   numeric;
  v_pos    positions;
  v_ticket tickets;
begin
  if v_side not in ('BUY', 'SELL') then
    raise exception 'side must be BUY or SELL';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be a positive integer';
  end if;

  select price into v_price from instruments where symbol = v_symbol;
  if v_price is null then
    raise exception 'unknown symbol %', v_symbol;
  end if;

  -- Lock the trader row so concurrent tickets are serialized.
  select cash_balance into v_cash from traders where id = p_trader_id for update;
  if v_cash is null then
    raise exception 'trader not found';
  end if;

  v_cost := round(v_price * p_quantity, 2);
  select * into v_pos from positions
    where trader_id = p_trader_id and symbol = v_symbol;

  if v_side = 'BUY' then
    if v_cost > v_cash then
      raise exception 'insufficient cash: need %, have %', v_cost, v_cash;
    end if;
    update traders set cash_balance = cash_balance - v_cost where id = p_trader_id;
    if v_pos.trader_id is null then
      insert into positions (trader_id, symbol, shares, avg_cost)
        values (p_trader_id, v_symbol, p_quantity, v_price);
    else
      update positions
        set avg_cost = (avg_cost * shares + v_price * p_quantity) / (shares + p_quantity),
            shares = shares + p_quantity
        where trader_id = p_trader_id and symbol = v_symbol;
    end if;
  else
    if v_pos.trader_id is null or v_pos.shares < p_quantity then
      raise exception 'insufficient shares: have %, want to sell %',
        coalesce(v_pos.shares, 0), p_quantity;
    end if;
    update traders set cash_balance = cash_balance + v_cost where id = p_trader_id;
    if v_pos.shares = p_quantity then
      delete from positions where trader_id = p_trader_id and symbol = v_symbol;
    else
      update positions set shares = shares - p_quantity
        where trader_id = p_trader_id and symbol = v_symbol;
    end if;
  end if;

  insert into tickets (trader_id, symbol, side, quantity, price)
    values (p_trader_id, v_symbol, v_side, p_quantity, v_price)
    returning * into v_ticket;
  return v_ticket;
end;
$$;

-- The API uses the service-role key (bypasses RLS); lock tables for anon access.
alter table instruments enable row level security;
alter table traders     enable row level security;
alter table tickets     enable row level security;
alter table positions   enable row level security;

-- Traders a user trusts (they then see the user's data); see supabase/trusted_traders.sql.
create table if not exists trusted_traders (
  user_id   uuid not null references auth.users (id) on delete cascade,
  trader_id uuid not null references traders (id) on delete cascade,
  primary key (user_id, trader_id)
);
alter table trusted_traders enable row level security;
