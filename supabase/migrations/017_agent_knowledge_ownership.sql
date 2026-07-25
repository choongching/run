-- Knowledge follows the agent's new audience rules: owners manage the
-- knowledge of their own agents, and anyone who can see an agent can read
-- its knowledge list (the run route reads it in the runner's context, so
-- the old assigned-only select would silently mount nothing for a user
-- running a company-visible agent).

drop policy "Users view knowledge of assigned active agents" on agent_knowledge;

create policy "Users view knowledge of visible agents"
  on agent_knowledge for select to authenticated
  using (can_see_agent(agent_id));

create policy "Owners manage knowledge of own agents"
  on agent_knowledge for all
  using (is_agent_owner(agent_id))
  with check (is_agent_owner(agent_id));

-- "Admins manage agent knowledge" (008) stays.
