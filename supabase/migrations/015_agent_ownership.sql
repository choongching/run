-- Phase 7 (permissions): anyone can build and own agents. Building stops
-- being an admin role gate; the admin role shrinks to company capabilities
-- (integrations, users, company context, see-everything). Additive only.
--
-- Ownership + visibility. New agents start private to their owner;
-- existing agents were all admin-built and squad-assigned, so they become
-- company-visible (nothing disappears for anyone) and owned by the
-- earliest admin (the original creator is not recorded anywhere).

create type agent_visibility as enum ('private', 'company');

alter table agents
  add column owner_id   uuid references profiles(id) on delete set null,
  add column visibility agent_visibility not null default 'private';

update agents set
  owner_id = (
    select id from profiles where role = 'admin' order by created_at limit 1
  ),
  visibility = 'company';

create index agents_owner_idx on agents (owner_id);

-- Agents RLS: audience-scoped policies (RLS answers "who are you").
-- Owner: full control of own agents. Admin: full control of everything
-- (company capability, kept for governance). Everyone else: read access to
-- active agents that are company-visible or explicitly shared to them.

drop policy "Admins manage agents" on agents;
drop policy "Users view assigned active agents" on agents;

create policy "Owners manage own agents"
  on agents for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Admins manage all agents"
  on agents for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "Users view company-visible active agents"
  on agents for select to authenticated
  using (status = 'active' and visibility = 'company');

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

-- user_agents becomes the sharing ACL as well as the notes store. The old
-- "Users manage own squad" FOR ALL policy let any user insert a row for ANY
-- agent id, which under the new model would grant themselves visibility
-- into private agents via the assigned-select policy above. Replace it with
-- scoped policies: users may only self-add rows for agents they can already
-- see (the agents subquery runs under the caller's own RLS), and owners of
-- an agent may manage rows for other users (that is what sharing is).

drop policy "Users manage own squad" on user_agents;

create policy "Users view own squad rows"
  on user_agents for select
  using (auth.uid() = user_id);

create policy "Users add visible agents to own squad"
  on user_agents for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from agents a where a.id = agent_id)
  );

create policy "Users update own squad rows"
  on user_agents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users remove own squad rows"
  on user_agents for delete
  using (auth.uid() = user_id);

create policy "Agent owners manage sharing rows"
  on user_agents for all
  using (
    exists (select 1 from agents a where a.id = agent_id and a.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from agents a where a.id = agent_id and a.owner_id = auth.uid())
  );

-- "Admins manage all squad entries" (004) stays: admin assignment drawer
-- keeps working as the see-everything view of the same rows.
