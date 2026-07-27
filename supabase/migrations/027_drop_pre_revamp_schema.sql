-- Remove the pre-revamp company/squad model.
--
-- Run started as a company product: an admin created agents, assigned them to
-- members, and members ran "missions". The prompt-first revamp replaced all of
-- that with one person talking to their own agent, and every user now gets
-- their own space. What is dropped here has had zero application references
-- since that change; it survives only as tables, columns, and RLS policies that
-- make the schema read as if the old model were still alive.
--
-- Verified before writing: `missions`, `mission_events`, and `user_agents` have
-- no `from(...)` call anywhere in app/, lib/, or components/, and
-- `agents.visibility` appears only in the hand-authored Database type. The
-- company_settings Pipedream columns belonged to the single org-wide Drive
-- account; connections are per user now and live on `user_connections`, which
-- is what the five code references to `pipedream_account_id` actually use.
--
-- Deliberately kept:
--   agents.schedule       reserved for scheduled runs
--   agents.status         still drives the sidebar and the run guard
--   profiles.role         roles come off the feature path, but a hidden
--                         platform role stays for support and abuse handling
--   is_agent_owner()      still the basis of agent and knowledge policies

-- Usage rows still carried a foreign key to missions, always written as null
-- since the revamp. It has to go before the table it points at. (The first
-- attempt at this migration failed here, which is why the drops below are
-- unqualified: a loud failure beats a half-cleaned schema.)
alter table usage_events drop column if exists mission_id;

-- Missions and their event log.
drop table if exists mission_events;
drop table if exists missions;

-- Assigning an agent to a user has no meaning when a user only sees their own.
drop table if exists user_agents;

-- Two agent SELECT policies existed only to serve the squad model: one for
-- assigned agents, one for company-visible agents. Ownership is the whole rule
-- now, and "Owners manage own agents" already covers it.
drop policy if exists "Users view assigned active agents" on agents;
drop policy if exists "Users view company-visible active agents" on agents;

alter table agents
  drop column if exists visibility,
  drop column if exists default_output_type,
  drop column if exists guardrails;

-- Starting a chat used to be allowed for any agent you could see, which meant
-- assigned or company-visible. Ownership is the whole rule now.
drop policy if exists "Users create threads for visible agents" on threads;
create policy "Users create threads for own agents"
  on threads for insert to authenticated
  with check (auth.uid() = user_id and is_agent_owner(agent_id));

-- Both helpers answer questions that no longer exist (is this agent assigned to
-- me, is it company-visible). Dropped after every policy that called them: the
-- other two callers live on tables dropped above.
drop function if exists can_see_agent(uuid);
drop function if exists is_assigned_to_agent(uuid);

-- The org-wide Drive account and the company blurb, from when there was one
-- company. company_settings now holds exactly one useful thing, the shared
-- Anthropic environment id, which provisions itself on first use.
alter table company_settings
  drop column if exists pipedream_account_id,
  drop column if exists pipedream_connected_by,
  drop column if exists pipedream_connected_at,
  drop column if exists company_context;

-- Enum types left behind by the columns above. These are unqualified drops on
-- purpose: if anything still references one, the migration fails loudly rather
-- than leaving a half-cleaned schema.
drop type if exists agent_visibility;
drop type if exists mission_status;
drop type if exists mission_output_type;
