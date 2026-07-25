-- Revamp phase 2: each chat thread maps to one persistent Managed Agents
-- session, so multi-turn conversation keeps its context natively (the agent
-- remembers prior turns). Created on the first message, reused after.
alter table threads add column session_id text;
