-- Usage events: one row per Anthropic call (mission runs, prompt
-- generation) with token counts and estimated cost. Rows are written only
-- through the service-role client, so there is deliberately no insert
-- policy; RLS covers reads (admins see everything, users see their own).

create table usage_events (
  id            uuid           primary key default gen_random_uuid(),
  user_id       uuid           not null references profiles(id) on delete cascade,
  agent_id      uuid           references agents(id)   on delete set null,
  mission_id    uuid           references missions(id) on delete set null,
  model         text           not null,
  input_tokens  int            not null default 0,
  output_tokens int            not null default 0,
  cost_usd      numeric(10, 6) not null default 0,
  event_type    text           not null check (event_type in ('mission_run', 'prompt_generation')),
  created_at    timestamptz    not null default now()
);

alter table usage_events enable row level security;

create policy "Admins view usage events"
  on usage_events for select
  using (get_my_role() = 'admin');

create policy "Users view own usage events"
  on usage_events for select
  using (user_id = auth.uid());

create index usage_events_user_idx    on usage_events (user_id);
create index usage_events_created_idx on usage_events (created_at desc);
