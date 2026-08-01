-- Routines: scheduled work an agent does on its own.
--
-- A routine is its own row, not a setting on the agent, because one agent can
-- carry several jobs (morning triage, a Monday summary, a monthly chase) and
-- each needs its own rule, its own history, and its own on/off switch.
--
-- The rule is a small JSON object ({freq, interval, byday, monthDay, hour,
-- minute, anchor, tz}), NOT a cron string. Cron cannot say "every 2 weeks" or
-- "every 10 days" (no interval on weeks; day-of-month resets each month), and
-- those are exactly the schedules people ask for. The anchor date gives an
-- interval its phase: "every 2 weeks on Wednesday" means nothing until you say
-- which Wednesday it counts from. lib/routines/rule.ts is the single
-- interpreter; the database stores and never parses it.
--
-- next_run_at is denormalized from the rule so the runner's query is an index
-- scan, not a rule evaluation over every row. It is advanced AT CLAIM TIME
-- (compare-and-swap in the tick route), which makes firing at-most-once: a
-- crashed run is a skipped run, never a doubled one. For a product that reads
-- inboxes, skipping beats repeating.

create table routines (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- The standing instruction, kept as prose the user can read and edit. What
  -- the agent is told each run, alongside the carry note below.
  instruction text not null,
  rule jsonb not null,
  -- 'paused' is the user's own switch; 'paused_system' is ours (allowance ran
  -- out, or three failures in a row). Kept distinct because "I turned it off"
  -- and "Run turned it off" must never look the same: conflating them is how
  -- someone waits on a report that is never coming.
  status text not null default 'active'
    check (status in ('active', 'paused', 'paused_system')),
  next_run_at timestamptz,
  last_run_at timestamptz,
  -- One bad run is noise; three in a row is a broken connector. The executor
  -- resets this on success and the tick pauses the routine at 3.
  consecutive_failures int not null default 0,
  -- What the last run reported, capped short, injected into the next run as
  -- "last time you said". This is how "tell me what changed" has a "since
  -- when" without the transcript growing into the prompt forever.
  carry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The runner's whole query: active and due. Everything else scans this.
create index routines_due_idx on routines (status, next_run_at);
create index routines_agent_idx on routines (agent_id);

create trigger routines_updated_at
  before update on routines
  for each row execute procedure update_updated_at_column();

alter table routines enable row level security;

create policy "Users read own routines"
  on routines for select using (auth.uid() = user_id);
create policy "Users create routines for own agents"
  on routines for insert
  with check (auth.uid() = user_id and is_agent_owner(agent_id));
create policy "Users update own routines"
  on routines for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own routines"
  on routines for delete using (auth.uid() = user_id);

-- One row per run: what happened, said briefly. The ledger for the routine's
-- detail view and for the "failing" derivation. usage_events keeps the money
-- side; this keeps the story side (headline, error, timing).
--
-- session_id and pending_tools ship now but stay null in v1: a scheduled run
-- never leaves a pending approval (it asks in words instead). They exist so
-- the waiting-approval-card follow-up is a route branch and a card, not a
-- migration.
create table routine_runs (
  id uuid primary key default uuid_generate_v4(),
  routine_id uuid not null references routines(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- The first line of what the run reported: the row a person scans.
  headline text,
  error text,
  session_id text,
  pending_tools jsonb,
  created_at timestamptz not null default now()
);

create index routine_runs_routine_idx on routine_runs (routine_id, started_at desc);

alter table routine_runs enable row level security;

-- Read-only for owners. Runs are written by the runner with the service role
-- (no insert/update policy on purpose, same stance as usage_events): a run
-- record is a ledger entry, and the person it belongs to cannot edit it.
create policy "Users read own routine runs"
  on routine_runs for select using (auth.uid() = user_id);

-- agents.schedule was reserved in 019 for exactly this feature. The routines
-- table supersedes it; two homes for one fact is how they drift apart.
alter table agents drop column if exists schedule;
