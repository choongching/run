-- Missions: a user's briefs to their assigned agents, run through Claude
-- Managed Agents Sessions. 'pdf' is included in the output enum from day one
-- (the spec added it later in 017; there is no reason to defer it here).

create type mission_status      as enum ('needs_attention', 'in_progress', 'completed');
create type mission_output_type as enum ('doc', 'sheet', 'text', 'pdf');

create table missions (
  id               uuid                primary key default gen_random_uuid(),
  user_id          uuid                not null references profiles(id) on delete cascade,
  agent_id         uuid                not null references agents(id)   on delete cascade,
  title            text                not null,
  brief            text                not null,
  status           mission_status      not null default 'needs_attention',
  output_type      mission_output_type not null default 'text',
  output_url       text,
  output_text      text,
  anthropic_run_id text,
  web_search       boolean             not null default false,
  created_at       timestamptz         not null default now(),
  completed_at     timestamptz
);

alter table missions enable row level security;

-- RLS answers "who are you": owners manage their own missions, admins can
-- read everything. Run-state gating (only queued missions may run) lives in
-- the run route, not in policies.

create policy "Users manage own missions"
  on missions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins view all missions"
  on missions for select
  using (get_my_role() = 'admin');

create index missions_user_status_idx on missions (user_id, status, created_at desc);

-- Shared Managed Agents runtime Environment for all mission sessions,
-- created once from Admin > Integrations.

alter table company_settings
  add column anthropic_environment_id text;
