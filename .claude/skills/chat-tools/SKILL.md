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
  (ask_user reply), `confirm` (setup review accepted), `resume` (after a
  connection lands), `attach` (file upload). They only differ in the
  `initialEvents` they pass and what they do around the drain.
- `drainSession` is a thin wrapper around `drainSessionInner`. It owns the
  token tally and a try/catch/finally so every turn records usage even when it
  fails, and so every thrown error leaves as a mapped `error` frame. See the
  `usage-accounting` skill.
- **Client** reads the NDJSON, dispatches each `Frame` in `handleFrame`, and
  renders cards.

## Frame protocol (keep server + client copies in sync)

`Frame` is declared in BOTH `run-turn.ts` and `chat-thread.tsx`; add a variant
in both. Adding a FIELD to an existing variant is the quieter trap: the server
spreads (`...proposal`) but `handleFrame` rebuilds several cards field by field
(`setReview({ name, instructions, ... })`), so a new field type-checks
everywhere and silently never arrives. Follow the field to the setState call,
not just to the type. Current variants: `start`, `thinking`, `delta` (token text), `activity`
(tool line), `artifact` (downloadable document), `connect` (needs a connection),
`approval` (write gate), `ask` (ask_user options card), `review` (setup
confirmation card), `onboarded` (setup done), `done` (final text), `error`.
Empty `done` text is fine; the client skips it.

`error` is not a free-text field: it is `{ type: 'error' } & ChatError`, always
built by `toChatError`. See "Errors" below.

Two event families feed `activity`: our custom tools via `toolActivity`, and
the platform's built-in tools (`agent.tool_use`: web_search, web_fetch) via
`builtinActivity`, which labels each step with its REAL input (the query, the
host). Sandbox internals (bash, file ops) return null there on purpose: "Ran
ls" confuses more than it informs. Never invent step detail the stream did
not provide. Client-side, consecutive activity rows fold into the compact
StepsBlock (see build-ui).

## Pause / resume (the load-bearing mechanic)

At `session.status_idle` with `stop_reason.type === 'requires_action'`, the
agent has pending `custom_tool_use` calls. `drainSession` picks a lane by
priority: **ask_user** (question) -> **propose_setup** (review card) ->
**anything not an auto-run tool** (approval) -> **auto-run tools** (exec).
SAFE BY DEFAULT: only `isAutoRunTool` passes (that is `READ_TOOLS` plus
`create_document`, which produces an in-chat artifact with no external effect);
a write OR any unclassified tool gates for approval, so a new tool can never
auto-run a side effect just because it was left off a list.
A pause persists the pending call(s) to `threads.pending_tools`, emits
its card frame, and `break`s, returning `{ status: 'ask' | 'approval' | null }`.

**One pending call per thread.** `threads.pending_tools` is a single column, so
two cards can never share a turn. This is a design constraint, not a bug, and
it decides sequencing for any feature that wants to end a turn on a card: the
routine offer waits until AFTER the first task precisely because
`propose_setup` already owns the setup turn. If a plan has an agent raising two
cards at once, the plan is wrong.
A resume route feeds `user.custom_tool_result` back and the SAME stream
continues (verified). Reads execute inline via `executeTool`; `needs_connection`
emits a `connect` frame + an `is_error` tool result so the agent asks the user
to connect.

Reload safety: the chat page rebuilds the pending card from `pending_tools`
(`initialAsk` vs `initialApproval`, distinguished by `isAskTool`).

## The setup review (`propose_setup`)

The interview no longer ends by silently writing the agent's name and
instructions and starting work. The agent calls `propose_setup` on its closing
turn, which pauses exactly like a question does and renders
`components/chat/review-card.tsx`. The person edits either field, or types a
correction, then confirms.

- **The agent writes the proposal, not the server.** That is what lets someone
  say "no, I meant invoices" and get a rewritten card instead of a polite reply
  next to a stale one.
- **It costs no extra turn.** It rides the closing turn the interview already
  takes.
- **The connector line only names what the person named first**
  (`neededConnectors` matches their own words). Every agent is handed the same
  five tools today, so listing what it *could* touch would tell someone whose
  agent reads documents that it also wants their email. When nothing matches,
  the line disappears rather than guessing. Revisit this once agents get their
  own connector lists.
- The `confirm` route saves the edited name, runs `finalizeOnboarding` with the
  confirmed text as `baseSystemPrompt`, resolves the pending call, then drains
  `FIRST_TASK_KICKOFF`.

## Errors

Every route funnels failures through `toChatError` in `lib/chat/errors.ts` and
renders `components/chat/error-note.tsx`. Never forward an exception message to
the screen: six routes used to, which is how `status is not defined` and a raw
provider payload both reached a conversation.

- One file classifies by status (429, 5xx, 401/403, 400 out-of-step, 404
  expired, 413 too large) and by `AbortError`, which is not a failure at all.
  Twenty phrasings spread across six routes drift apart within a month.
- Our fault gets a short `reference` plus a `console.error`, so the person has
  something to quote and we have something to grep.
- The card is quiet, not red, and offers a retry only when retrying can work.
  It disappears on a successful continue.
- Tool failures are different: `executeTool` returns the error text **to the
  agent**, not the screen, so it can explain in its own words. That is the one
  path where a raw payload could still be quoted at a person, so it strips
  `{...}` JSON, collapses whitespace, caps at 200 chars, and appends an
  instruction never to show it.
- Copy rules for any new message live in the `write-copy` skill.

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
- **A session waiting on a tool call rejects a plain `user.message`** with
  400 "waiting on responses to events". If the person types instead of tapping
  the card (a correction during setup review, say), you must send a
  `user.custom_tool_result` for the pending call FIRST, then their message.
- **Keep that tool result neutral.** Passing the person's correction AS the
  tool result made the agent answer the wrong question ("I looked into that,
  but I don't have anything to add right now"). The result says only that the
  user has not confirmed and to expect a revision; their actual words go in the
  `user.message` that follows.
- Token delta text is `event.delta.content.text` when `event.delta.type ===
  'content_delta'` (marker on `event.delta`, not `.content`).
- The React Compiler (`react-hooks/immutability`) forbids referencing a
  component function before its declaration once an effect traces the call
  graph: declare leaf helpers (`commitDraft`, `finishWithError`, `handleFrame`)
  ABOVE `consumeStream`/`runStream`.
- Persist the user's message before streaming so a mid-turn failure never loses
  it; hidden kickoffs (onboarding, first-task) are NOT persisted as user rows.
