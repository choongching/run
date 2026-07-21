-- "My Squad": which agents are assigned to which users, plus each user's
-- personal custom instructions for that agent.

create table user_agents (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  agent_id            uuid not null references agents(id)   on delete cascade,
  custom_instructions text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (user_id, agent_id)
);

alter table user_agents enable row level security;

create policy "Users manage own squad"
  on user_agents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins manage all squad entries"
  on user_agents for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');
