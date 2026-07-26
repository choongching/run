---
name: agent-prompt
description: Compose or edit an agent's system prompt (the policy-sentinel contract). Use when changing onboarding, personalities, the security or role-boundary floor, or anything that writes an agent's system field.
---

# Agent prompt composition for Run

An agent's `system` prompt is NOT free text. It is composed: the user's base
instructions plus a generated policy region, fenced by a sentinel. The security
floor and role boundary live in that generated region, so writing `system` by
hand silently drops them. Everything here is enforced at the sites below; keep it
that way.

Source: `lib/chat/onboarding.ts` (composer) and `lib/agents/personalities.ts`
(voice presets). The SDK layer that persists `system` is the `managed-agents`
skill; the run loop that consumes it is `chat-tools`.

## The contract

- `buildSystemPrompt(base, answers, personality)` returns:
  `base` + `<!-- run:policy -->` + setup preferences (if any) + `## Voice` (the
  personality clause) + `## Security` (SECURITY_PREAMBLE) + `## Staying on task`
  (ROLE_BOUNDARY). Composition order is fixed; the security and role sections are
  ALWAYS appended, on every agent.
- It is idempotent: it calls `stripBrief` on its own input first, so passing an
  already composed prompt re-derives cleanly (no doubled policy blocks).
- `stripBrief(system)` returns just the base by removing everything from the
  sentinel on. It also matches the legacy `## Setup preferences` heading so
  agents saved before the sentinel still strip. This is what the config panel
  shows in the editable Instructions box, so the generated region never leaks in.

## The invariant (do not break)

EVERY write of an agent's `system` field goes through `buildSystemPrompt`, and
the ONLY place that shows base instructions for editing uses `stripBrief`. The
enforced sites:

- `app/actions/agents.ts` `startAgentFromPrompt` -> `buildSystemPrompt(prompt, [])`
  (create).
- `app/actions/agents.ts` `updateAgentConfig` ->
  `buildSystemPrompt(base, answers, personality)` (config-panel save).
- `lib/chat/onboarding.ts` `finalizeOnboarding` -> `buildSystemPrompt(...)` (end
  of the setup interview).
- `app/(dashboard)/chat/[agentId]/page.tsx` -> `stripBrief(agent.system_prompt)`
  to seed the editable Instructions.

If you add a new site that sets `system`, route it through `buildSystemPrompt`.
If you add a new place that edits instructions, seed it with `stripBrief`. A raw
write removes the injection floor and the role boundary with no error.

## Personalities

`lib/agents/personalities.ts` is client-safe on purpose (no SDK import) so the
config panel and the server composer share one source. `DEFAULT_PERSONALITY` is
`balanced`, whose clause is empty (adds no `## Voice`). To add a preset, extend
`PERSONALITIES` (id, label, description, clause); `isPersonality` and
`personalityClause` derive from that list.

## Rules

- The two policy sections (SECURITY_PREAMBLE, ROLE_BOUNDARY) are the safety
  floor. They are never shown in the editable instructions and never optional.
  The write-approval gate is the real guarantee (see `chat-tools`); this prompt
  text is defense in depth, not a substitute.
- Both policy sections and the setup kickoffs are written in plain sentences with
  no em dashes; keep new policy prose the same (house style).
- DB `agents.system_prompt` is the source of truth for the next session's prompt.
  The `beta.agents.update` sync of `system` is best-effort and must never block
  the DB write on a version conflict.
