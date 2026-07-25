-- 015 created a policy cycle: agents policies subquery user_agents, and
-- user_agents policies subquery agents, so Postgres reports infinite
-- recursion for any query touching either table. Break the cycle with
-- security definer helpers (they read the tables without re-entering RLS),
-- mirroring the get_my_role() pattern from 001/005.

create or replace function is_agent_owner(aid uuid)
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from agents where id = aid and owner_id = auth.uid()
  );
$$;

create or replace function is_assigned_to_agent(aid uuid)
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from user_agents
    where agent_id = aid and user_id = auth.uid() and is_active
  );
$$;

-- Full visibility rule in one place: owner, admin, company-visible active,
-- or actively assigned. Used where a user_agents policy needs to ask "can
-- this caller see that agent" without re-entering agents RLS.
create or replace function can_see_agent(aid uuid)
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from agents a
    where a.id = aid
      and (
        a.owner_id = auth.uid()
        or get_my_role() = 'admin'
        or (a.status = 'active' and a.visibility = 'company')
        or (
          a.status = 'active'
          and exists (
            select 1 from user_agents ua
            where ua.agent_id = a.id and ua.user_id = auth.uid() and ua.is_active
          )
        )
      )
  );
$$;

drop policy "Users view assigned active agents" on agents;
create policy "Users view assigned active agents"
  on agents for select to authenticated
  using (status = 'active' and is_assigned_to_agent(id));

drop policy "Users add visible agents to own squad" on user_agents;
create policy "Users add visible agents to own squad"
  on user_agents for insert
  with check (auth.uid() = user_id and can_see_agent(agent_id));

drop policy "Agent owners manage sharing rows" on user_agents;
create policy "Agent owners manage sharing rows"
  on user_agents for all
  using (is_agent_owner(agent_id))
  with check (is_agent_owner(agent_id));
