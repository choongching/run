-- Builder wizard (phase 8 / roadmap phase 3): structured agent config that
-- was previously implicit. Additive only.
--
-- enabled_tools: agent-level tool ceiling. Enforced for real: the Anthropic
-- dual-write maps these onto per-tool toolset configs (verified hard
-- enforcement, docs/capability-matrix-2026-07-25.md), and the per-mission
-- web-search toggle is capped by it.
-- guardrails: plain-language rules appended to every run's kickoff as a
-- labeled section. Instructions, not hard limits; the UI says so.

alter table agents
  add column enabled_tools jsonb not null default '{"web_search": true, "drive": true}'::jsonb,
  add column guardrails text;

-- Agent-level default output gains pdf, matching mission output types.
alter table agents drop constraint if exists agents_default_output_type_check;
alter table agents
  add constraint agents_default_output_type_check
  check (default_output_type in ('doc', 'sheet', 'text', 'pdf'));
