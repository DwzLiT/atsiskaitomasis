-- Traders a signed-in user trusts (Traders page): user_id trusts trader_id, so
-- the owner of trader_id sees user_id's traders in their Portfolio/History/Trade.
-- A user's own traders (traders.user_id) are always visible to them, so
-- they are not stored here. Run once in the Supabase SQL editor.

create table if not exists trusted_traders (
  user_id   uuid not null references auth.users (id) on delete cascade,
  trader_id uuid not null references traders (id) on delete cascade,
  primary key (user_id, trader_id)
);

-- The API uses the service-role key (bypasses RLS); lock the table for anon access.
alter table trusted_traders enable row level security;

notify pgrst, 'reload schema';
