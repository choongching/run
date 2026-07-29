-- Turn usage_events into something a person can read back: a history of runs.
--
-- The table was built to answer "how much have we spent". A history list asks
-- harder questions of the same rows: what was this run, who did it, can I go
-- look at it, and why did it happen. Four columns cover all four.
--
-- agent_name is a deliberate duplicate of agents.name. A history row is a
-- ledger entry: it records what was true when the work happened, and must not
-- change because the world changed afterwards. Agents are hard-deleted
-- (app/actions/agents.ts), and agent_id is `on delete set null`, so today
-- deleting an agent silently anonymises every run it ever did. The foreign key
-- stays for linking to an agent that still exists; the name is what the list
-- falls back to when it doesn't.
--
-- source separates what started the work from what the work was. event_type
-- already says which kind of call this was; source says whether a person asked
-- for it, a schedule fired it, or we did it on their behalf. Scheduled runs do
-- not exist yet, but the column does, so the day they land their history is
-- already correct instead of starting from a backfill nobody writes.
--
-- status exists because failed turns are now recorded at all. A turn that
-- threw halfway still spent money, so it belongs in the ledger, but it is not
-- something to charge a person for or to show them as work delivered.

alter table usage_events
  add column if not exists agent_name text,
  add column if not exists thread_id  uuid references threads(id) on delete set null,
  add column if not exists source     text not null default 'chat',
  add column if not exists status     text not null default 'completed';

alter table usage_events
  drop constraint if exists usage_events_source_check;
alter table usage_events
  add constraint usage_events_source_check
  check (source in ('chat', 'schedule', 'system'));

alter table usage_events
  drop constraint if exists usage_events_status_check;
alter table usage_events
  add constraint usage_events_status_check
  check (status in ('completed', 'failed'));

-- Existing rows: name them while their agents are still around to ask.
update usage_events u
   set agent_name = a.name
  from agents a
 where a.id = u.agent_id
   and u.agent_name is null;

-- Work we do on someone's behalf was never theirs to ask for.
update usage_events
   set source = 'system'
 where event_type in ('prompt_generation', 'agent_naming');

-- Reading a person's own history is the list's only query: newest first, one
-- month at a time.
create index if not exists usage_events_user_created_idx
  on usage_events (user_id, created_at desc);

-- A run only counts against a person when it actually ran. We still record
-- what a failed turn cost us, but charging someone for our own failure is a
-- way to lose them. Cost totals stay honest and include everything.
-- Dropped rather than replaced: `create or replace view` cannot insert a
-- column into the middle of an existing view's column list.
drop view if exists usage_monthly;
create view usage_monthly
with (security_invoker = on) as
select
  user_id,
  date_trunc('month', created_at) as month,
  count(*) filter (
    where event_type = 'mission_run' and status = 'completed'
  ) as runs,
  count(*) filter (where status = 'failed') as failed_runs,
  sum(input_tokens)                as input_tokens,
  sum(cache_creation_input_tokens) as cache_creation_input_tokens,
  sum(cache_read_input_tokens)     as cache_read_input_tokens,
  sum(output_tokens)               as output_tokens,
  sum(cost_usd)                    as cost_usd
from usage_events
group by user_id, date_trunc('month', created_at);
