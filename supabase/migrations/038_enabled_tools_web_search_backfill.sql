-- Make enabled_tools say what the product has always done.
--
-- Until 2026-08-18 new agents were written with `{"web_search": false}` while
-- every session was created with `buildAgentToolset({ web_search: true })`.
-- Because `agent_with_overrides` REPLACES the tool set, the override won and
-- the column was decoration: all four agents in this database read false, and
-- one of them has run 49 searches.
--
-- The code now restates the ceiling at session creation, which makes the column
-- real. That turns the stale `false` into a live switch that nobody ever chose
-- and no UI can undo: the next scheduled run of a news routine would quietly
-- come back with nothing to report, and it would look like the agent failing
-- rather than a setting.
--
-- So the recorded value is corrected to what was actually in force. This is not
-- a policy change. It is writing down the policy that was already running.
--
-- Chat threads are unaffected either way: tools attach when a session is
-- created, and existing threads already hold theirs. It is the routines
-- executor, which builds a fresh session per run, that would have felt this.

update agents
set enabled_tools = coalesce(enabled_tools, '{}'::jsonb) || '{"web_search": true}'::jsonb
where coalesce(enabled_tools ->> 'web_search', 'false') <> 'true';
