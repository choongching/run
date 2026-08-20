---
name: dev-cleanup
description: Sweep dev test data (agents/threads/messages made while testing) back to the demo trio, and archive their orphaned remote Anthropic agents. Use when the founder asks to clean up dev data.
---

# Dev data cleanup for Run

Testing creates real agents (Supabase rows + remote Anthropic agents). This
sweep returns the dev DB to just the demo agents. Confirm the target Supabase
ref first (`get_project_url` vs the ref in project memory, since a stale MCP session
can point at an unrelated project).

## What to keep

The canonical keep-set is recorded in project memory
(`run-project-state.md`) and ONLY there; do not trust any list written in
this file, because it goes stale (an earlier revision here named a demo trio
that had already been replaced by a single agent). Read the memory's current
dev-DB line at the start of every sweep. Everything owned by test accounts
and not in that line is disposable. If unsure whether a given agent is demo
or test, ASK rather than delete.

## Steps

1. **See what exists:** `select id, name, claude_agent_id, created_at from
   agents order by created_at;` Identify the test agents (not in the demo set).
2. **Capture remote ids:** collect each test agent's `claude_agent_id` before
   deleting the rows (you cannot look them up after).
3. **Delete the DB rows:** `delete from agents where id in (...)`. `threads`,
   `messages`, `routines`, and `routine_runs` all cascade (migration 035), so a
   test agent's schedules disappear with it; verify the Routines page is clean
   afterwards. Do NOT touch `user_connections` (those are the user's own
   Gmail/Drive/Jina links, not per-agent), `company_settings`, or the billing
   ledgers `usage_events` and `search_usage`: those record real spend and are
   history, not test data.
4. **Archive the remote agents** so the Anthropic console is not littered: a
   scratchpad `.mjs` (project dir, run `node --env-file=.env.local`, delete
   after) calling `anthropic.beta.agents.archive(claudeAgentId, { betas:
   [MANAGED_AGENTS_BETA] })` for each captured id. Archiving is idempotent and
   safe.
5. **Verify:** reload the app; the sidebar shows only the demo set, with zero
   stray threads.

## Rules

- Never delete an agent you did not create in testing without confirming it is
  disposable. Deletions are hard to reverse for the founder.
- Reset (not delete) the demo trio's own threads if a test left messages in
  them: `delete from messages where thread_id in (select id from threads where
  agent_id in (<demo ids>));` then the thread reads clean.
- Ids and account details stay in project memory, never in this public skill.
