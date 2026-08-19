-- How many web searches a person has used this month.
--
-- A rollup table rather than a count over usage_events, and the reasons are all
-- bugs we would otherwise have shipped:
--
--   1. usage_events is written fire-and-forget in a `finally`. On Vercel that
--      row can be dropped after the stream closes. A search that happened and
--      was not recorded is a search we paid for and gave away.
--   2. One conversational turn spans up to six separate drainSession calls
--      across routes, so "searches this turn" is not a number any single row
--      holds.
--   3. getRunAllowance filters `status = 'completed'`. Copied for searches,
--      that would let anyone abort a stream and search for free.
--
-- So counting is awaited, at the moment a search succeeds, one increment per
-- search, independent of whether the turn that asked for it ever finishes.
--
-- The month is stored as the first day of the month in UTC, which makes the
-- monthly read one primary-key lookup instead of a range scan that grows with
-- the person's whole history.

create table if not exists public.search_usage (
  user_id  uuid    not null references auth.users(id) on delete cascade,
  month    date    not null,
  searches integer not null default 0,
  primary key (user_id, month)
);

alter table public.search_usage enable row level security;

-- Read your own, and nothing else. There is deliberately NO insert or update
-- policy: the number the allowance is measured against must not be editable by
-- the person it limits. Writes go through the function below, called with the
-- service-role key, which bypasses RLS by design.
drop policy if exists "read own search usage" on public.search_usage;
create policy "read own search usage" on public.search_usage
  for select using (auth.uid() = user_id);

-- One atomic increment. `on conflict do update` rather than read-then-write, so
-- two searches finishing at the same moment cannot both read 4 and both write 5.
create or replace function public.increment_search_usage(uid uuid, at_month date)
returns integer
language sql
volatile
set search_path = public
as $$
  insert into public.search_usage (user_id, month, searches)
  values (uid, at_month, 1)
  on conflict (user_id, month)
  do update set searches = public.search_usage.searches + 1
  returning searches;
$$;

-- Least privilege, and it takes three revokes rather than one. Revoking from
-- PUBLIC is not enough: Supabase ships ALTER DEFAULT PRIVILEGES that grant
-- EXECUTE on every new function in `public` to anon and authenticated by name,
-- and a named grant is not a PUBLIC grant. Verified by reading proacl after the
-- first attempt, which still showed anon=X. Migration 034 is the earlier
-- version of the same lesson.
--
-- Belt and braces: even if a caller reached the function, the missing insert
-- policy above stops the write. Confirmed by probe, which failed with "new row
-- violates row-level security policy" rather than incrementing.
revoke execute on function public.increment_search_usage(uuid, date) from public;
revoke execute on function public.increment_search_usage(uuid, date) from anon;
revoke execute on function public.increment_search_usage(uuid, date) from authenticated;
grant execute on function public.increment_search_usage(uuid, date) to service_role;
