-- Revamp phase 1: the chat surface schema. An agent is now something you
-- talk to: one persistent thread per user per agent, with the conversation
-- and its tool-activity lines in a single ordered stream. Additive only.

-- Optional cron expression for proactive runs. Ships now so the data model
-- and run pipeline stay schedule-ready; the v1 UI never shows it.
alter table agents add column schedule text;

create type message_role as enum ('user', 'agent', 'activity');

create table threads (
  id         uuid        primary key default gen_random_uuid(),
  agent_id   uuid        not null references agents(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- v1 rule: one thread per user per agent. Drop this index when
-- multi-thread lands; nothing else assumes it.
create unique index threads_agent_user_key on threads (agent_id, user_id);

create trigger threads_updated_at
  before update on threads
  for each row execute procedure update_updated_at_column();

alter table threads enable row level security;

-- Personal chats are owner-only: deliberately NO admin read-all policy
-- (unlike missions). A thread is a private conversation, not org telemetry.
create policy "Users view own threads"
  on threads for select using (auth.uid() = user_id);

create policy "Users create threads for visible agents"
  on threads for insert
  with check (auth.uid() = user_id and can_see_agent(agent_id));

-- updated_at is bumped when a message lands; the UPDATE reads the row
-- back, which the owner SELECT policy above covers.
create policy "Users update own threads"
  on threads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own threads"
  on threads for delete using (auth.uid() = user_id);

-- The conversation stream. 'activity' rows are tool-activity lines shown
-- collapsed in the thread; payload carries their raw event detail.
create table messages (
  id         bigint       generated always as identity primary key,
  thread_id  uuid         not null references threads(id) on delete cascade,
  role       message_role not null,
  content    text         not null default '',
  payload    jsonb        not null default '{}'::jsonb,
  created_at timestamptz  not null default now()
);

create index messages_thread_idx on messages (thread_id, id);

alter table messages enable row level security;

-- Append-only: no update/delete policies for anyone. Owner SELECT covers
-- insert read-back (see supabase-ops rules).
create policy "Users insert messages in own threads"
  on messages for insert
  with check (
    exists (
      select 1 from threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

create policy "Users view messages in own threads"
  on messages for select
  using (
    exists (
      select 1 from threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );
