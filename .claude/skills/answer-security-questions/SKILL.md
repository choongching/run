---
name: answer-security-questions
description: Answer someone's question about Run's safety, guardrails, prompt injection, or permissions (an email, an issue, a README section). Use whenever a reply would make a claim about what an agent can or cannot do.
---

# Answering security questions about Run

Someone asked how Run is safe. The answer is worth more than the reassurance,
so the rule is simple: **verify every claim in the code before writing it, and
publish the layer where the answer is weakest.**

## The procedure

1. **Never answer from memory.** Read the actual files. A claim about tools
   comes from `lib/tools/definitions.ts` and `lib/tools/execute.ts`; a claim
   about approval comes from `app/api/chat/[agentId]/approve/route.ts`; a
   claim about a provider API comes from the client module (e.g. which Gmail
   endpoint `lib/tools/gmail.ts` actually calls).
2. **Probe the layer you do not own.** Our code is only the top layer. What
   the connected account is PERMITTED to do lives with the provider: ask
   Google directly with a tokeninfo call through the Pipedream proxy (a
   throwaway script in the project dir, run with `node --env-file=.env.local`,
   deleted after). Findings, not consoles, are shareable.
3. **Rank the layers by strength** in the answer: absence of capability
   first, server-enforced gates second, prompt instructions last (and label
   the prompt layer as what it is).
4. **Say the weak part out loud.** If a layer does not hold, name it before
   the reader finds it. Credibility comes from the paragraph that costs
   something.
5. **Then fix it.** A published weakness becomes an open item in the
   `security-audit` skill's ledger.

## What is true today (verified 2026-08-01)

- Agent tools are exactly: `gmail_search`, `gmail_get_message`,
  `gmail_create_draft`, `drive_list_files`, `drive_read_file`,
  `drive_create_folder`, `drive_move_file`, `drive_rename_file`, plus
  `create_document` and `ask_user`. **There is no send tool**, and
  `lib/tools/gmail.ts` contains only search, create-draft, get-message.
  The draft POSTs to Google's `/drafts` endpoint, which cannot send.
- `executeTool` rejects any name outside its allowlist before touching an
  account; `isAutoRunTool` auto-runs reads only, so writes and anything
  unrecognized pause the session.
- The approve route reads `pending_tools` off the caller's own thread row,
  clears it (no double-run), and executes ONLY that stored call. The request
  body carries a yes/no and nothing else.
- KNOWN WEAK LAYER: the Pipedream Gmail connector's OAuth grant includes
  `gmail.send`, `gmail.modify`, `gmail.settings.basic`. Run never calls them
  and has no code path to, but the provider-level permission exists, so
  "Google itself would refuse" is NOT a claim we may make. Narrowing this
  (reduced Pipedream scopes, or our own Google OAuth client) is an open item.

## Voice

First person singular: it is one person's project, and "we" reads as fog.
Open by saying the claims were checked rather than recalled, that is what
earns the reader's trust in the list that follows. Plain sentences, no
jargon the reader has to unpack, no em dashes (see `write-copy`). End on the
sharpest true line, not on reassurance.
