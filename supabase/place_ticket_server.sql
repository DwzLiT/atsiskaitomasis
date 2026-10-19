-- Re-adds the server-side place_ticket(trader_id, symbol, side, quantity) used by
-- POST /api/tickets. It has a different signature from the 3-argument
-- place_ticket(symbol, side, quantity), so both can coexist.
-- Run in the Supabase SQL editor. The last line refreshes the API schema cache.

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

notify pgrst, 'reload schema';
