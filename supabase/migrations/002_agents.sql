-- Agents configured by admins; dual-written to the Claude Managed Agents API.
-- Supabase is the source of truth; claude_agent_id links the two.

create table agents (
  id                   uuid primary key default uuid_generate_v4(),
  claude_agent_id      text unique,
  name                 text not null,
  description          text,
  system_prompt        text,
  model                text not null default 'claude-sonnet-5',
  is_active            boolean not null default true,
  default_output_type  text check (default_output_type in ('doc', 'sheet', 'text')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table agents enable row level security;

create policy "Authenticated users can view active agents"
  on agents for select to authenticated using (is_active = true);

create policy "Admins can insert agents"
  on agents for insert with check (get_my_role() = 'admin');

create policy "Admins can update agents"
  on agents for update using (get_my_role() = 'admin');

create policy "Admins can delete agents"
  on agents for delete using (get_my_role() = 'admin');

create or replace function update_updated_at_column()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger agents_updated_at
  before update on agents
  for each row execute procedure update_updated_at_column();
