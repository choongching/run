-- A smoke alarm for dropped usage writes.
--
-- Two counters record the same events by different routes:
--
--   search_usage.searches         written one row per search, awaited, in the
--                                 executor, the moment the search succeeds
--   usage_events.provider_searches written once per turn, at the end
--
-- They count the same thing, so they must agree. On 2026-08-19 they did not:
-- 8 against 7. The gap was a usage row that never got written, because a
-- serverless function is stopped once its response finishes and nobody was
-- waiting on that insert. Nothing errored. The log was clean. The only reason
-- we noticed is that one of the two numbers had been made reliable on purpose.
--
-- So the accident is kept as an instrument. Both writes are awaited now and
-- these two columns should stay equal forever; any drift means writes are
-- being lost again, whatever the new reason turns out to be. Silent failures
-- are the ones that hurt, and this one is no longer silent.
--
-- Read it with: select * from usage_integrity where drift <> 0;
--
-- Deliberately a view rather than a job or an alert. It costs nothing when
-- nobody looks, there is one person to look, and a check that has to be
-- maintained is a check that gets switched off.

create or replace view usage_integrity
with (security_invoker = on) as
select
  s.user_id,
  s.month,
  s.searches as counted_at_execution,
  coalesce(e.provider_searches, 0) as counted_in_the_ledger,
  s.searches - coalesce(e.provider_searches, 0) as drift
from public.search_usage s
left join (
  select
    user_id,
    date_trunc('month', created_at)::date as month,
    sum(provider_searches) as provider_searches
  from usage_events
  group by user_id, date_trunc('month', created_at)::date
) e on e.user_id = s.user_id and e.month = s.month;

-- security_invoker keeps RLS the underlying tables' business: search_usage is
-- owner-read and usage_events is owner-read, so a person sees only their own
-- drift and never anyone else's.
grant select on usage_integrity to authenticated, service_role;
