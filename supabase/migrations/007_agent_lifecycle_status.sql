-- Replace the is_active boolean with a lifecycle status enum, add sync
-- metadata for the Anthropic dual-write, and reshape RLS into two
-- audience-scoped policies: RLS answers "who are you", queries answer
-- "what state do you want". A row's mutable state must never control
-- visibility for the role that mutates it.

create type agent_status as enum ('draft', 'active', 'paused', 'archived');

alter table agents
  add column status agent_status not null default 'active',
  add column archived_at timestamptz,
  add column claude_version int,
  add column synced_at timestamptz;

update agents set status = 'archived', archived_at = updated_at where is_active = false;

drop policy "Authenticated users can view active agents" on agents;
drop policy "Admins can insert agents" on agents;
drop policy "Admins can update agents" on agents;
drop policy "Admins can delete agents" on agents;
drop policy "Admins can view all agents" on agents;

alter table agents drop column is_active;

create policy "Admins manage agents"
  on agents for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "Users view assigned active agents"
  on agents for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from user_agents ua
      where ua.agent_id = agents.id
        and ua.user_id = auth.uid()
        and ua.is_active
    )
  );
