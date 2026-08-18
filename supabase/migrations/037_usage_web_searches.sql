-- Count the web searches a turn performed, and price them.
--
-- Anthropic bills web search at $10 per 1,000 on top of tokens, inside Managed
-- Agents sessions too. We were recording tokens only, so every cost figure in
-- the product excluded it. Audited 2026-08-18: 49 searches performed since 26
-- July, $0.49 incurred, $0 recorded. On a search-heavy scheduled run the fee is
-- about 40% of the run.
--
-- There is no counter to read. The session `model_usage` event carries the four
-- token fields and nothing else (no `server_tool_use`, unlike the Messages API),
-- so the count comes from tallying `agent.tool_use` events named `web_search`
-- in the drain loop, which is where the activity lines are already built.
--
-- The column defaults to 0, so every existing row keeps the cost_usd it was
-- written with. History is not rewritten; only new turns carry the fee.

alter table usage_events
  add column if not exists web_searches integer not null default 0;

-- The monthly view gains the same sum. Two cautions, both learned the hard way
-- and both load-bearing here:
--
--   1. `create or replace view` cannot insert a column mid-list ("cannot change
--      name of view column"), so this is a drop and create. Migration 030
--      records that.
--   2. The view MUST be recreated `with (security_invoker = on)`. Without it a
--      view runs as its owner and bypasses the RLS on usage_events, which would
--      show every user's spend to every user. Verified present before this
--      migration was written; it is restated here so a future drop and create
--      cannot lose it silently.

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
  sum(cost_usd) as cost_usd
from usage_events
group by user_id, date_trunc('month', created_at);

-- Restated rather than assumed: a dropped view loses its grants, and the
-- schema defaults that would restore them are not something to rely on.
grant select on usage_monthly to authenticated, service_role;
