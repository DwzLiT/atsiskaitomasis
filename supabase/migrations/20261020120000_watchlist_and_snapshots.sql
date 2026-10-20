-- Real data for the parts of the app that were still demos:
--   * per-user watchlist
--   * portfolio value snapshots for the Portfolio and P/L charts
--   * daily change % stored with each instrument price

-- —— Instruments: keep the last change % next to the price ——
alter table public.instruments
  add column if not exists change_percent numeric(10, 4);

-- Replaces the 3-argument version. p_company may be null (keeps the stored
-- name) and p_change_percent is optional, so old calls still work.
drop function if exists public.upsert_instrument(text, text, numeric);

create or replace function public.upsert_instrument(
  p_symbol         text,
  p_company        text,
  p_price          numeric,
  p_change_percent numeric default null
) returns public.instruments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_symbol  text := upper(trim(p_symbol));
  v_company text := nullif(trim(p_company), '');
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

  insert into public.instruments as i (symbol, company, price, change_percent, updated_at)
    values (v_symbol, coalesce(v_company, v_symbol), p_price, p_change_percent, now())
  on conflict (symbol) do update
    set company = coalesce(v_company, i.company),
        price = excluded.price,
        change_percent = coalesce(p_change_percent, i.change_percent),
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

revoke execute on function public.upsert_instrument(text, text, numeric, numeric) from public, anon;
grant execute on function public.upsert_instrument(text, text, numeric, numeric) to authenticated;

-- —— Watchlist ——
create table if not exists public.watchlist (
  trader_id  uuid not null references public.traders (id) on delete cascade,
  symbol     text not null references public.instruments (symbol),
  created_at timestamptz not null default now(),
  primary key (trader_id, symbol)
);

alter table public.watchlist enable row level security;

create policy "Users view own watchlist" on public.watchlist
  for select to authenticated using (
    trader_id in (select id from public.traders where user_id = (select auth.uid()))
  );

create policy "Users remove from own watchlist" on public.watchlist
  for delete to authenticated using (
    trader_id in (select id from public.traders where user_id = (select auth.uid()))
  );

-- Adding goes through this function so the browser never sends a trader id.
-- The symbol must already be in instruments (saved by upsert_instrument).
create or replace function public.add_to_watchlist(p_symbol text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trader_id uuid;
  v_symbol text := upper(trim(p_symbol));
begin
  select id into v_trader_id from public.traders where user_id = auth.uid();
  if v_trader_id is null then
    raise exception 'not logged in or no trader account';
  end if;
  if not exists (select 1 from public.instruments where symbol = v_symbol) then
    raise exception 'unknown symbol %', v_symbol;
  end if;

  insert into public.watchlist (trader_id, symbol)
    values (v_trader_id, v_symbol)
  on conflict do nothing;
end;
$$;

revoke execute on function public.add_to_watchlist(text) from public, anon;
grant execute on function public.add_to_watchlist(text) to authenticated;

-- —— Portfolio snapshots ——
create table if not exists public.portfolio_snapshots (
  id              bigint generated always as identity primary key,
  trader_id       uuid not null references public.traders (id) on delete cascade,
  cash            numeric(14, 2) not null,
  positions_value numeric(14, 2) not null,
  total_value     numeric(14, 2) not null,
  created_at      timestamptz not null default now()
);
create index if not exists portfolio_snapshots_trader_created_idx
  on public.portfolio_snapshots (trader_id, created_at);

alter table public.portfolio_snapshots enable row level security;

-- Read-only for users; rows are only written by the functions below.
create policy "Users view own snapshots" on public.portfolio_snapshots
  for select to authenticated using (
    trader_id in (select id from public.traders where user_id = (select auth.uid()))
  );

-- Internal helper, not exposed through the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Saves cash + market value of positions (avg cost when there is no price).
create or replace function private.take_snapshot(p_trader_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cash numeric;
  v_positions numeric;
begin
  select cash_balance into v_cash from public.traders where id = p_trader_id;
  select coalesce(sum(p.shares * coalesce(i.price, p.avg_cost)), 0)
    into v_positions
    from public.positions p
    left join public.instruments i on i.symbol = p.symbol
    where p.trader_id = p_trader_id;

  insert into public.portfolio_snapshots (trader_id, cash, positions_value, total_value)
    values (p_trader_id, v_cash, round(v_positions, 2), round(v_cash + v_positions, 2));
end;
$$;

-- Called when the Portfolio page opens. Adds a starting point for new users
-- and at most one snapshot per hour, so refreshing doesn't flood the table.
create or replace function public.record_snapshot()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trader public.traders;
  v_last timestamptz;
begin
  select * into v_trader from public.traders where user_id = auth.uid();
  if v_trader.id is null then
    raise exception 'not logged in or no trader account';
  end if;

  select max(created_at) into v_last
    from public.portfolio_snapshots where trader_id = v_trader.id;

  if v_last is null then
    insert into public.portfolio_snapshots (trader_id, cash, positions_value, total_value, created_at)
      values (v_trader.id, 10000, 0, 10000, v_trader.created_at);
  end if;

  if v_last is null or v_last < now() - interval '1 hour' then
    perform private.take_snapshot(v_trader.id);
  end if;
end;
$$;

revoke execute on function public.record_snapshot() from public, anon;
grant execute on function public.record_snapshot() to authenticated;

-- —— place_ticket: same as before, plus a snapshot after every trade ——
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

  -- Same transaction, so the snapshot gets the ticket's created_at.
  perform private.take_snapshot(v_trader_id);
  return v_ticket;
end;
$$;

-- —— Backfill history for existing users from their past tickets ——
-- Replays each trade from the 10 000 start, valuing holdings at the latest
-- trade price seen so far, then adds one snapshot at today's prices.
do $$
declare
  v_trader record;
  v_ticket record;
  v_cash numeric;
  v_shares jsonb;
  v_prices jsonb;
  v_value numeric;
begin
  for v_trader in
    select t.id, t.created_at from public.traders t
    where t.user_id is not null
      and not exists (select 1 from public.portfolio_snapshots s where s.trader_id = t.id)
  loop
    v_cash := 10000;
    v_shares := '{}'::jsonb;
    v_prices := '{}'::jsonb;

    insert into public.portfolio_snapshots (trader_id, cash, positions_value, total_value, created_at)
      values (v_trader.id, 10000, 0, 10000, v_trader.created_at);

    for v_ticket in
      select * from public.tickets
      where trader_id = v_trader.id and status = 'FILLED'
      order by created_at
    loop
      if v_ticket.side = 'BUY' then
        v_cash := v_cash - round(v_ticket.price * v_ticket.quantity, 2);
        v_shares := jsonb_set(v_shares, array[v_ticket.symbol],
          to_jsonb(coalesce((v_shares->>v_ticket.symbol)::int, 0) + v_ticket.quantity));
      else
        v_cash := v_cash + round(v_ticket.price * v_ticket.quantity, 2);
        v_shares := jsonb_set(v_shares, array[v_ticket.symbol],
          to_jsonb(coalesce((v_shares->>v_ticket.symbol)::int, 0) - v_ticket.quantity));
      end if;
      v_prices := jsonb_set(v_prices, array[v_ticket.symbol], to_jsonb(v_ticket.price));

      select coalesce(sum(s.value::int * (v_prices->>s.key)::numeric), 0)
        into v_value
        from jsonb_each_text(v_shares) s;

      insert into public.portfolio_snapshots (trader_id, cash, positions_value, total_value, created_at)
        values (v_trader.id, v_cash, round(v_value, 2), round(v_cash + v_value, 2), v_ticket.created_at);
    end loop;

    perform private.take_snapshot(v_trader.id);
  end loop;
end;
$$;
