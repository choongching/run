-- Record the input tokens we were throwing away, and roll usage up per month.
--
-- A usage row stored input_tokens straight off the model's usage report, which
-- counts only the part of the prompt that was NOT served from cache. Managed
-- Agents caches aggressively, so on a real session almost the whole prompt
-- arrives as cache reads instead: 118 recorded chat turns came to 312 input
-- tokens between them, about three per turn. Those two counts are separate
-- fields on the wire, and they are priced differently (a cache read is a tenth
-- of the input rate, writing the cache is a quarter more), so they get their
-- own columns rather than being folded into input_tokens. Keeping the API's
-- own names means the next person reading the wire format finds what they
-- expect.
--
-- Rows written before this point undercount input and cannot be repaired: the
-- cache counts were never stored. Their cost_usd is effectively output-only.

alter table usage_events
  add column if not exists cache_creation_input_tokens int not null default 0,
  add column if not exists cache_read_input_tokens     int not null default 0;

-- Naming a new agent is a real model call and was spending unrecorded.
alter table usage_events
  drop constraint if exists usage_events_event_type_check;
alter table usage_events
  add constraint usage_events_event_type_check
  check (event_type in ('mission_run', 'prompt_generation', 'agent_naming'));

-- Every question the product will ask of this table is "how much has this
-- person used this month", so index the pair rather than the columns apart.
create index if not exists usage_events_user_month_idx
  on usage_events (user_id, created_at desc);

create index if not exists usage_events_agent_idx
  on usage_events (agent_id);

-- One row per person per month, so a plan meter is a single cheap read
-- instead of a scan the UI has to sum itself. security_invoker keeps the
-- table's RLS in force: you see your own months, an admin sees everyone's.
--
-- runs counts only what a person would call using the product. Naming an
-- agent and generating a prompt are ours, not theirs; they still carry cost,
-- so they stay in the cost and token totals.
create or replace view usage_monthly
with (security_invoker = on) as
select
  user_id,
  date_trunc('month', created_at) as month,
  count(*) filter (where event_type = 'mission_run') as runs,
  sum(input_tokens)                as input_tokens,
  sum(cache_creation_input_tokens) as cache_creation_input_tokens,
  sum(cache_read_input_tokens)     as cache_read_input_tokens,
  sum(output_tokens)               as output_tokens,
  sum(cost_usd)                    as cost_usd
from usage_events
group by user_id, date_trunc('month', created_at);
