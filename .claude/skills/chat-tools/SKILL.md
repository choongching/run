---
name: chat-tools
description: Work on the chat run loop, its streaming frame protocol, or its custom tools (reads, write-approval, connect, ask_user). Use when adding or changing a chat tool, the pause/resume mechanics, or how the client renders a turn.
---

# Chat tools and the run loop for Run

The chat surface is a client state machine driven by a server NDJSON stream.
Read `lib/chat/run-turn.ts` (`drainSession`, the shared engine) and
`components/chat/chat-thread.tsx` (the client) before changing either. The
Anthropic SDK layer under this is the `managed-agents` skill.

## The shape

- **Server** (`drainSession`) opens the session event stream, sends the
  triggering events, drains, and `send()`s one JSON `Frame` per line.
- **Routes** each build a `ReadableStream` of those frames: `message` (a user
  turn), `approve` (write decision), `onboarding` (setup kickoff), `answer`
  (ask_user reply). They only differ in the `initialEvents` they pass and what
  they do around the drain.
- **Client** reads the NDJSON, dispatches each `Frame` in `handleFrame`, and
  renders cards.

## Frame protocol (keep server + client copies in sync)

`Frame` is declared in BOTH `run-turn.ts` and `chat-thread.tsx`; add a variant
in both. Current variants: `start`, `thinking`, `delta` (token text), `activity`
(tool line), `connect` (needs a connection), `approval` (write gate), `ask`
(ask_user options card), `onboarded` (setup done), `done` (final text), `error`.
Empty `done` text is fine; the client skips it.

## Pause / resume (the load-bearing mechanic)

At `session.status_idle` with `stop_reason.type === 'requires_action'`, the
agent has pending `custom_tool_use` calls. `drainSession` picks a lane by
priority: **ask_user** (question) -> **anything not a known read** (approval) ->
**known reads** (auto exec). SAFE BY DEFAULT: only tools in `READ_TOOLS`
(`isReadTool`) auto-run; a write OR any unclassified tool gates for approval, so
a new tool can never auto-run a side effect just because it was left off a list.
A pause persists the pending call(s) to `threads.pending_tools`, emits
its card frame, and `break`s, returning `{ status: 'ask' | 'approval' | null }`.
A resume route feeds `user.custom_tool_result` back and the SAME stream
continues (verified). Reads execute inline via `executeTool`; `needs_connection`
emits a `connect` frame + an `is_error` tool result so the agent asks the user
to connect.

Reload safety: the chat page rebuilds the pending card from `pending_tools`
(`initialAsk` vs `initialApproval`, distinguished by `isAskTool`).

## Adding a new chat tool

1. `lib/tools/definitions.ts`: add to `CHAT_TOOL_DEFINITIONS` (name, description,
   JSON `input_schema`) and `TOOL_APP` (which connection). A read-only tool MUST
   be added to `READ_TOOLS` to auto-execute; leave it off and it defaults to
   approval-gated (safe by default), which is what you want for anything with a
   side effect. Writes also get a `summarizeWrite` case for the approval card
   (`WRITE_TOOLS` is informational; the gate keys on `READ_TOOLS`).
2. `lib/tools/execute.ts`: dispatch it (returns `needs_connection | result |
   error`), unless it is an interaction tool handled purely in the loop
   (`ask_user` is: it never hits `executeTool`).
3. `lib/chat/run-turn.ts`: reads auto-exec already; a NEW pause type needs its
   own branch before the reads path plus a new frame, and must NOT get an
   activity line if it is a question (`isAskTool` skips it).
4. Client: handle the frame in `handleFrame`, render a card, add a resume path
   (mirror `respondToApproval` / `respondToAsk`), and reset the card in
   `runStream`.
5. New tools only reach sessions created AFTER they are added (tools attach at
   session creation). Backfill existing agents past any one-time trigger.

## Gotchas (each cost real time)

- NEVER `events.send` an empty events array -> 400 "events: must contain at
  least 1 item". Guard `if (!resultEvents.length) break`; use a `sentConnect`
  flag to suppress the "finished without a reply" error when a connect card was
  the real ending.
- Token delta text is `event.delta.content.text` when `event.delta.type ===
  'content_delta'` (marker on `event.delta`, not `.content`).
- The React Compiler (`react-hooks/immutability`) forbids referencing a
  component function before its declaration once an effect traces the call
  graph: declare leaf helpers (`commitDraft`, `finishWithError`, `handleFrame`)
  ABOVE `consumeStream`/`runStream`.
- Persist the user's message before streaming so a mid-turn failure never loses
  it; hidden kickoffs (onboarding, first-task) are NOT persisted as user rows.
