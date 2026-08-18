-- Searches run on OUR provider key, counted and priced separately from
-- Anthropic's built-in search.
--
-- The tempting shortcut was to keep using `web_searches`. It would have made
-- every cost figure wrong. lib/usage.ts multiplies that column by $0.01,
-- Anthropic's rate; Brave sells the same search at $0.005 and Jina at roughly
-- a fortieth of it. One column cannot carry two prices, and migration 037
-- states in writing what `web_searches` means. This keeps that true.
--
-- Both columns will be non-zero on the same row for a while: old sessions keep
-- Anthropic's built-in search alive until their session_id is rebuilt, so a
-- turn can legitimately do some of each.
--
-- Searches run on a user's OWN connected account are recorded in neither. They
-- are not our bill, and a ledger that counts someone else's spend as ours is
-- worse than one that counts nothing.

alter table usage_events
  add column if not exists provider_searches integer not null default 0;

-- Same drop-and-create as 037, for the same two reasons: `create or replace
-- view` cannot insert a column mid-list, and the view MUST come back with
-- security_invoker on or it runs as its owner and shows every user's spend to
-- every user.

drop view if exists usage_monthly;

create view usage_monthly with (security_invoker = on) as
select
  user_id,
  date_trunc('month', created_at) as month,
  count(*) filter (where event_type = 'mission_run' and status = 'completed') as runs,
  count(*) filter (where status = 'failed') as failed_runs,
  sum(input_tokens) as input_tokens,
  sum(cache_creation_input_tokens) as cache_creation_input_tokens,
  sum(cache_read_input_tokens) as cache_read_input_tokens,
  sum(output_tokens) as output_tokens,
  sum(web_searches) as web_searches,
  sum(provider_searches) as provider_searches,
  sum(cost_usd) as cost_usd
from usage_events
group by user_id, date_trunc('month', created_at);

grant select on usage_monthly to authenticated, service_role;
