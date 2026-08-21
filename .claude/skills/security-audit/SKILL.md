---
name: security-audit
description: Run the security sweep for the Run app - guardrails, API auth, RLS, headers, secrets. Use when asked to check security, before deploy, and after adding any tool, route, or policy.
---

# Security audit for Run

The sweep run on 2026-07-30. Verify by behavior first, code second; never
report a layer green from reading a migration file alone.

## 1. Agent guardrails (the product's core promise)

- **Fails closed**: `lib/tools/definitions.ts` gates on an explicit ALLOWLIST
  (`isAutoRunTool`); anything unclassified pauses for approval. When adding a
  tool, the check is that it fails closed, not that it is classified.
- **Approval integrity**: the approve route must execute ONLY the server-stored
  `pending_tools` of the caller's own thread (scoped by `user_id`), never
  anything from the request body.
- **Injection floor**: `SECURITY_PREAMBLE` and `ROLE_BOUNDARY` in
  `lib/chat/onboarding.ts` are composed behind the policy sentinel, outside the
  editable instructions. If prompt composition changes, confirm they survive.
- **Error hygiene**: tool errors are stripped of machine payloads before the
  model sees them (`lib/tools/execute.ts` catch block).
- KNOWN GAP (founder aware, undecided): Drive approval cards display the
  model-provided file/folder names, not server-resolved ones. An injected
  tool call could show an innocent name over a different file_id. Fix if
  approved: resolve id to real name at approval time.
- **Web search** (`search_web`, added 2026-08-18): auto-runs as a read, so
  its injection surface is real: snippets from the open web reach the model
  every turn. `lib/search/sanitize.ts` is the strip layer (same one shape as
  uploads) and `lib/search/limits.ts` bounds what reaches the prompt; the
  SECURITY_PREAMBLE names web pages and search results as data. Verify all
  three survive any change to the search pipeline.
- **Unattended runs**: a routine runs with `denyWrites: true`, so writes and
  unclassified tools are DECLINED in words (the agent describes instead) and
  `pending_tools` is never written; nothing can sit pending from a run with
  nobody watching. `lib/routines/execute.ts` also enforces the run and
  search allowances BEFORE each run; a capped routine pauses itself.

## 2. API surface (behavior probes)

Unauthenticated curl on EVERY route in `app/api` (all methods): expect 401
(405 where the method does not exist). Then
`grep -rL "requireUser\|getUserIdentity" app/api --include=route.ts` must
return nothing EXCEPT the TWO documented exceptions, both called by a
machine with no user behind them, both authenticating with a shared secret
via timing-safe compare and failing closed when the env var is missing:
`app/api/routines/tick/route.ts` (`ROUTINES_CRON_SECRET`) and
`app/api/telegram/webhook/route.ts` (`TELEGRAM_WEBHOOK_SECRET`, sent by
Telegram in the `X-Telegram-Bot-Api-Secret-Token` header). Verify those two
behaviors instead of user auth. Every file in `app/actions` must check
identity.
- The Telegram webhook has a second property to check, and it is a boundary
  rather than a scope cut: it understands `/start` and `/stop` and NOTHING
  else. Any other message gets one canned reply and is discarded. It must
  never pass what a person types into a model, because that would open a path
  from an unauthenticated chat into a system that reads their email and files.
  If anyone proposes "let people reply to their agent in Telegram", that is a
  new trust boundary, not a feature.
Rate backstop and run allowance both 429 on the message route; uploads
validate kind and size server side and pass the credential-scan gate.

## 3. RLS (probe, do not trust files)

Confirm the MCP session targets the right project first (supabase-ops skill).
Then: pg_class join pg_policy for RLS-enabled + policy count on every public
table; pg_policies for per-command coverage; and the behavior probe: as an
unrelated authenticated sub and as anon,
`select count(*)` on user_connections, usage_events, agent_knowledge,
knowledge_sources, messages, threads, routines, routine_runs, search_usage,
user_telegram must all be 0.
- `user_telegram` is the strictest table in the schema and should stay that
  way: SELECT-your-own-row and NO write policy at all, so the only writer is
  the service role behind the webhook. That is what stops someone pointing
  their reports at a chat Telegram never confirmed they control. Probe the
  write denial, not just the read. Run
`get_advisors(security)` and triage every WARN.

- TRAP: `authenticated` needs EXECUTE on the SECURITY DEFINER policy helpers
  (policies evaluate them with the caller's privileges).
  Trigger functions like handle_new_user need no API-role EXECUTE at all.
- TRAP: revoking EXECUTE from `anon` alone does NOTHING while the default
  grant to PUBLIC stands (has_function_privilege('anon', ...) stays true).
  Revoke from PUBLIC, then grant back `authenticated` explicitly
  (migrations 033+034). Always re-check with has_function_privilege after.
- TRAP: a storage SELECT policy cannot be dropped to stop bucket listing;
  uploads read the object row back. Scope it to the uploader's folder.
- Schema security changes (revokes, policy swaps) are blocked by the
  permission gate: write the migration to the repo and ask the founder to
  approve applying it. Never route around via execute_sql.

## 4. Platform

- Headers: X-Frame-Options DENY, nosniff, Referrer-Policy are set in
  next.config.ts (the approval gate must not be frameable). Verify with
  `curl -sI` after any config change; config changes need a dev restart.
- TRAP, found 2026-08-21: `POST /api/routines/tick` answers **500, not 401**,
  on a machine where `ROUTINES_CRON_SECRET` is unset. That is the fail-closed
  branch firing before auth, not an open route. Confirm the variable's absence
  before treating it as a finding.
- Secrets: `git config core.hooksPath` is `.githooks`, private-patterns file
  present (git-ignored; recreate from private memory on a fresh clone).
  Server-only keys now include `BRAVE_API_KEY` (the platform search key;
  a missing key throws SearchUnavailableError, it never falls back),
  `ROUTINES_CRON_SECRET` (lives in the Vercel env and the cron job body
  ONLY, never the repo), `TELEGRAM_BOT_TOKEN` (send-only: a leak lets
  someone send as us and read nothing), `TELEGRAM_WEBHOOK_SECRET` (SHARED
  WITH TELEGRAM by design, so treat it as a value a third party holds) and
  `TELEGRAM_PAIRING_SECRET` (ours alone, signs pairing tokens, must never
  equal the webhook secret). Verified 2026-08-21 that none of the three
  Telegram values, nor the Brave key, appear anywhere in `.next/static`.
- Full CSP is deliberately deploy-day work; do not bolt one on quickly.

## Open items ledger (update as they close)

- Telegram pairing signed with a key Telegram holds: **FIXED 2026-08-21**,
  found by this sweep. `mintPairingToken` used `TELEGRAM_WEBHOOK_SECRET` as
  its HMAC key, and that is the one value in the system we deliberately give
  away: it is registered with Telegram at setWebhook time and echoed back on
  every call. Anyone holding it could mint a token naming any user id, send
  `/start`, and receive that account's routine reports. The user id was no
  obstacle either, because `profiles` is readable by every signed-in user.
  Now signed with its own `TELEGRAM_PAIRING_SECRET`; verified behaviorally
  that a token signed with the webhook secret is rejected as `bad_signature`.
  THE RULE: a secret shared with a third party must never also be a signing
  key for our own claims. Check this whenever a new signed token appears.
- `profiles` is SELECT-able by every authenticated user (`qual = true`), so
  any signed-in person can read every account's uuid, display name, avatar and
  role. Pre-existing and possibly deliberate, but it is what turned the finding
  above from theoretical into practical, and nothing in the app appears to need
  cross-user profile reads. FOUNDER DECISION: scope it to `id = auth.uid()`, or
  say why not.
- Three SECURITY DEFINER helpers (`get_my_role`, `is_agent_owner`,
  `owns_knowledge_source`) show as advisor WARNs for being executable by
  `authenticated`. That is REQUIRED, not a defect: policies evaluate them with
  the caller's privileges. Do not "fix" these; migrations 033+034 already did
  the real lockdown (revoke from PUBLIC, grant back authenticated).

- Migration 033+034 (RPC lockdown + avatar listing scope): APPLIED
  2026-07-31, verified via has_function_privilege + RLS probe.
- Leaked-password protection: PLAN-GATED (no toggle on Free, verified
  2026-07-31). Closes with the plan-tier upgrade, required before open
  signup.
- Drive approval-card name resolution: founder undecided.
- Brave platform key rotation: PENDING (flagged 2026-08-19, founder
  action). Until rotated, treat the current key as possibly exposed.
- Gmail OAuth scope too broad (found 2026-08-01 answering a user's
  injection question): the Pipedream Gmail connector's grant includes
  gmail.send, gmail.modify, gmail.settings.basic. No code path uses them,
  but the permission exists, so the provider layer is not a backstop.
  Narrow via reduced connector scopes or our own Google OAuth client (which
  the Google verification long pole needs anyway). Published in the
  README's Security FAQ; do not claim Google would refuse until fixed.
  Same finding for Drive: that grant is full `auth/drive` while the tool
  surface is five calls (list, read, create folder, move, rename), with no
  delete or trash anywhere. Both grants are the same fix.
  FIX FOUND 2026-08-20, and it is cheap: Pipedream exposes named scope
  profiles per app (`read_only` / `read_write` for both Gmail and Drive) and
  an `oauth_scope_profile` parameter on the connect flow.
  `app/api/connections/[app]/route.ts` passes none, so we take the broad
  default. Narrowing does NOT require our own Google OAuth client. See
  docs/google-oauth-spike-2026-08-20.md.
- Google app verification is NOT a blocker and never was: we ride Pipedream's
  OAuth apps (verified 2026-08-20, every connected account carries Pipedream's
  own client ids). Our own client would need Google's restricted-scope path,
  which includes a PAID third-party security assessment repeated annually.
  Do not put "get Google verified" on a roadmap without pricing it.

## Report

Checklist with pass/fail and one line of evidence each, findings ranked,
fixes shipped separately from findings that need the founder's decision.
