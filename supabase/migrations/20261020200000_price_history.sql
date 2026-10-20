-- Daily closing prices saved from Alpha Vantage (TIME_SERIES_DAILY), so the
-- price chart still shows real data after the daily API limit is reached.

create table if not exists public.price_history (
  symbol text not null references public.instruments (symbol) on delete cascade,
  date   date not null,
  close  numeric(14, 4) not null check (close > 0),
  primary key (symbol, date)
);

alter table public.price_history enable row level security;

create policy "Logged-in users view price history" on public.price_history
  for select to authenticated using (true);

-- Saves a batch of closes: p_rows = [{"date": "2026-10-19", "close": 228.1}, ...].
-- The symbol must already be in instruments (saved by upsert_instrument).
create or replace function public.save_price_history(p_symbol text, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_symbol text := upper(trim(p_symbol));
begin
  if auth.uid() is null then
    raise exception 'not logged in';
  end if;
  if not exists (select 1 from public.instruments where symbol = v_symbol) then
    raise exception 'unknown symbol %', v_symbol;
  end if;

  insert into public.price_history (symbol, date, close)
    select v_symbol, (r->>'date')::date, (r->>'close')::numeric
    from jsonb_array_elements(p_rows) as r
    where (r->>'close')::numeric > 0
  on conflict (symbol, date) do update set close = excluded.close;
end;
$$;

revoke execute on function public.save_price_history(text, jsonb) from public, anon;
grant execute on function public.save_price_history(text, jsonb) to authenticated;
