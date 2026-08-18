---
name: managed-agents
description: Work with Anthropic Managed Agents at the SDK layer (agents CRUD, environments, sessions, streaming). Use for any change touching the Anthropic SDK beyond plain Messages. For the app-level chat run loop, frames, and custom-tool pause/resume, use the chat-tools skill.
---

# Managed Agents for Run

Verified live against the installed `@anthropic-ai/sdk`. The canonical live run
loop is `lib/chat/run-turn.ts` (`drainSession`); read it before changing how a
chat turn streams. Client + constants live in `lib/anthropic/client.ts`
(`MANAGED_AGENTS_BETA` is the beta flag every call needs in its `betas` array;
`NAMING_MODEL` is the small model for utility calls like agent naming). This
skill is the Anthropic SDK layer; the `chat-tools` skill covers the frame
protocol and pause/resume built on top of it.

## Agents API (dual-write from our DB)

- The agent definition field is `system`, NOT `system_prompt`.
- Create/update sites today: `app/actions/agents.ts` (`startAgentFromPrompt`,
  `renameAgent`) and `lib/chat/onboarding.ts` (`finalizeOnboarding`). We store
  `claude_agent_id`, `claude_version`, `synced_at` on the `agents` table.
- Updates are versioned: pass the `version` from create/retrieve; on a conflict
  retrieve again and retry. Cosmetic syncs (name, onboarding brief) are
  best-effort: never let a version conflict block the DB write, which is the
  UI's source of truth.
- `buildAgentToolset({ web_search })` builds the `agent_toolset_20260401`
  config. Sessions replace the tool set via `agent_with_overrides` (below).

## Tool config: what the API will and will not do for you

The `agent_toolset_20260401` config accepts **only `enabled` and
`permission_policy`** per tool. There is no `max_uses`, no `allowed_domains`,
no `max_content_tokens` (those exist on the Messages API web search tool, not
here). So the platform gives us **no way to cap how many searches a single run
performs**. If a spend cap is needed, it has to live in a custom tool we own.

`default_config: { enabled: false }` is the way to start everything off and
opt tools back in.

Tool output over 100,000 characters is written to a file in the sandbox and
the model gets a truncated preview plus the path.

**Cost, because it is invisible in our meter:** `web_search` is $10 per 1,000
searches on top of tokens; `web_fetch` is free beyond tokens; sessions also
bill $0.08 per session-hour while `running`. See the `usage-accounting` skill.
Source: https://platform.claude.com/docs/en/managed-agents/tools

**Live bug as of 2026-08-18, check before trusting `enabled_tools`:**
`app/actions/agents.ts` creates agents with `web_search: false`, but
`lib/chat/session.ts` and `lib/routines/execute.ts` both hardcode
`buildAgentToolset({ web_search: true })` when they open a session. Because
`agent_with_overrides` REPLACES the tool set, the per-agent ceiling never
applies at runtime. Pass the agent's real `enabled_tools` at both sites.

## Environments

One shared cloud environment, created once, stored in
`company_settings.anthropic_environment_id`:

```ts
anthropic.beta.environments.create({
  name, description,
  config: { type: 'cloud', networking: { type: 'unrestricted' } },
  betas: [MANAGED_AGENTS_BETA],
})
```

`POST /api/admin/environment` is the idempotent wrapper (admin Connections page).

## Sessions: the chat run flow

One persistent session per thread (`threads.session_id`) gives native multi-turn
memory. Created on the first turn, reused after.

1. **Create with custom tools.** `beta.sessions.create({ agent: { id, type:
   'agent_with_overrides', tools: [...buildAgentToolset({ web_search: true }),
   ...CHAT_TOOL_DEFINITIONS] }, environment_id, title, betas })`.
   `agent_with_overrides.tools` REPLACES the set, so include the base toolset.
   Tools attach at CREATION ONLY: a thread whose session predates a new tool
   will not have it (so a migration that adds a tool must not retro-onboard old
   agents onto their old sessions).
2. **Stream first, then send** so no event is lost:
   `events.stream(id, { event_deltas: ['agent.message'], betas })` BEFORE
   `events.send(id, { events, betas })`.
3. **Drain** (see `drainSession`): `event_start` (start / `agent.thinking`),
   `event_delta` (token text is `event.delta.content.text` when
   `event.delta.type === 'content_delta'`; the marker is on `event.delta`, NOT
   on `event.delta.content`), `agent.message` (authoritative text blocks),
   `agent.custom_tool_use` (collect `{ id, name, input }`),
   `span.model_request_end` (usage), `session.error` (keep `.error.message`).
4. **Break/pause** on `session.status_terminated`, or on `session.status_idle`
   when `stop_reason.type !== 'requires_action'`. On `requires_action`, feed
   `user.custom_tool_result` back and the SAME STREAM resumes (see chat-tools).
   NEVER `events.send` an empty events array: the API 400s with
   "events: must contain at least 1 item". Guard `if (!resultEvents.length) break`.

## Knowledge file mounting (currently unused)

The mission run route that mounted Drive files as session resources was removed
in the prompt-first revamp. If knowledge-in-chat returns: upload pre-extracted
TEXT with `beta.files.upload({ file: await toFile(Buffer.from(text, 'utf-8'),
name, { type: 'text/plain' }) })` (NOT raw bytes; the container read tool fails
on .docx and some PDFs), pass as `resources` `{ type: 'file', file_id,
mount_path }`, and use the RESOLVED paths from `session.resources` (re-rooted
under `/mnt/session/uploads/...`).

## Hard-won rules

- Declare token counters OUTSIDE the try so the catch can still record usage.
- `recordUsage` (`lib/usage.ts`, service-role, never throws) is fire-and-forget:
  call with `void`, `missionId: null` for chat turns.
- Run/stream routes are synchronous with `export const maxDuration = 300`.
- A fetch fired from a page keeps running server-side after the client
  navigates away; do not infer failure from an aborted request.
