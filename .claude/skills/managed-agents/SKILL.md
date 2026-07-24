---
name: managed-agents
description: Work with Anthropic Managed Agents (agents CRUD, environments, sessions, file mounting, event streaming). Use for any change to the mission run flow or anything touching the Anthropic SDK beyond plain Messages.
---

# Managed Agents for Run

Everything here was verified live against the installed `@anthropic-ai/sdk`.
The canonical working implementation is `app/api/missions/[id]/run/route.ts`;
read it before changing the run flow. Client + constants live in
`lib/anthropic/client.ts` (`MANAGED_AGENTS_BETA` is the beta flag every call
needs in its `betas` array).

## Agents API (dual-write from our DB)

- The agent definition field is `system`, NOT `system_prompt`.
- Updates are versioned: pass the `version` from a prior retrieve; on a
  conflict, retrieve again and retry. We store `claude_version` + `synced_at`
  on our `agents` table.
- Give agents the full toolset via `AGENT_TOOLSET`
  (`agent_toolset_20260401`, enabled) so sessions can read mounted files, run
  bash, and use web search.

## Environments

One shared cloud environment for the whole company, created once and stored in
`company_settings.anthropic_environment_id`:

```ts
anthropic.beta.environments.create({
  name, description,
  config: { type: 'cloud', networking: { type: 'unrestricted' } },
  betas: [MANAGED_AGENTS_BETA],
})
```

`POST /api/admin/environment` is the idempotent wrapper.

## Sessions: the run flow

1. **Mount knowledge as pre-extracted text.** Upload with
   `beta.files.upload({ file: await toFile(Buffer.from(text, 'utf-8'), name, { type: 'text/plain' }) })`
   (`toFile` is exported from the SDK root). Do NOT mount raw bytes: the
   container's read tool cannot handle .docx and returns empty for some PDFs.
2. **Create the session** with the agent's string id, `environment_id`,
   `title`, and `resources` (`{ type: 'file', file_id, mount_path }`).
3. **Use the RESOLVED mount paths.** The API re-roots requested paths under
   `/mnt/session/uploads/...`; read them back from `session.resources` and put
   those (not the requested paths) in the kickoff message.
4. **Stream first, then send**, so no event between send and subscribe is
   lost: `events.stream(id, { betas })` before
   `events.send(id, { events: [{ type: 'user.message', content: [{ type: 'text', text }] }], betas })`.
5. **Drain loop:**
   - `agent.message`: content is text blocks; the LAST agent message is the
     deliverable.
   - `span.model_request_end`: accumulate `.model_usage.input_tokens` and
     `.output_tokens`. Cache tokens (`cache_creation_input_tokens`,
     `cache_read_input_tokens`) are separate fields and are NOT counted in v1
     cost estimates.
   - `session.error`: keep `.error.message` for the failure path.
   - Break on `session.status_terminated`, or on `session.status_idle` when
     `stop_reason.type !== 'requires_action'` (stop reasons: `end_turn`,
     `requires_action`, `retries_exhausted`).
6. **Cleanup:** delete the uploaded Files API files afterwards (the session
   keeps its own copies). Do NOT archive the session; it stays inspectable in
   the Console and its id is stored as `anthropic_run_id`.

## Hard-won rules

- Declare token counters OUTSIDE the try block so the catch path can still
  record usage for a failed run.
- Usage rows are written fire-and-forget via `recordUsage` in `lib/usage.ts`
  (service-role client, never throws). Call it with `void`.
- The run route is synchronous with `export const maxDuration = 300`; the
  platform timeout is the run's ceiling.
- A fetch fired from a page keeps running server-side even if the client
  navigates away; do not infer run failure from an aborted request.
