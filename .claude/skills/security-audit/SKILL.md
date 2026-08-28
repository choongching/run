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
- `app/api/favicon/route.ts` is the THIRD no-user route (added 2026-08-21) and
  the only one safe to leave open, because nothing sits behind it: it returns a
  public brand image and reveals nothing about the caller. It is also the most
  dangerous route in the app, because a server that fetches a host the caller
  names is SSRF by default. Check all of it, every sweep: `lib/favicon.ts` is
  an ALLOW shape (a hostname must look like an ordinary registrable domain, and
  the alphabetic final label is what refuses every IPv4 literal without parsing
  one), the scheme and path are fixed so only the host varies, redirects are
  manual with exactly ONE hop and the new host re-tested, only image
  content-types are relayed, the response content-type is ours and never the
  upstream one, and the body is buffered so the REAL length is enforced rather
  than the declared one. Probe it with `169.254.169.254`, `localhost` and
  `metadata.google.internal`; all must 404.
  THE RULE: any future route that fetches a caller-supplied address gets this
  same treatment, and "it is only an image" is not a reason to relax it.
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
  `ROUTINES_CRON_SECRET` (lives in the Vercel env and in Supabase Vault as
  `routines_cron_secret` ONLY, never the repo; migration 049 schedules the
  tick and reads it from Vault at run time, so `cron.job` carries no value),
  `TELEGRAM_BOT_TOKEN` (send-only: a leak lets
  someone send as us and read nothing), `TELEGRAM_WEBHOOK_SECRET` (SHARED
  WITH TELEGRAM by design, so treat it as a value a third party holds) and
  `TELEGRAM_PAIRING_SECRET` (ours alone, signs pairing tokens, must never
  equal the webhook secret). Verified 2026-08-21 that none of the three
  Telegram values, nor the Brave key, appear anywhere in `.next/static`.
- Full CSP is deliberately deploy-day work; do not bolt one on quickly.

## 5. Unattended jobs (added 2026-08-28, after a 28-hour silent outage)

The routine heartbeat is a pg_cron job (`routines-tick`) calling
`internal.routines_tick()`, which reads the bearer token from Vault
(`routines_cron_secret`) and POSTs the tick route. Migrations 049 and 050
own all of it. Check, every sweep, by behavior:

- `select jobname, active, command from cron.job` shows exactly ONE job,
  active, with the one-line command and NO literal token. The old job had
  the token pasted into its text and lived only in the dashboard; a
  developer switched it off there on 2026-08-27 and nothing in the repo
  could show it. Anything the app depends on that exists only in a dashboard
  is a finding, not a configuration.
- `has_schema_privilege(r, 'internal', 'usage')` and
  `has_function_privilege(r, 'internal.routines_tick()', 'execute')` are
  false for anon, authenticated AND service_role, and a PostgREST call to
  `/rest/v1/rpc/routines_tick` as anon answers 404 (the schema is not
  exposed). Do NOT pass a single-argument form of these functions and read
  the result as PUBLIC: it reports the CURRENT role, which is postgres.
- `pg_proc.proconfig` on the function carries `search_path=""`. The
  advisor flags any unpinned function, and this one runs as postgres from
  cron, which is the shape where an unpinned path is a privilege ladder.
  Every new function that cron or a trigger runs gets `set search_path = ''`
  and fully qualified references, in the same migration that creates it.
- The function RAISES when the Vault entry is missing, so a misconfiguration
  is a failed row in `cron.job_run_details`, not a 401 logged as success.
  The raise branch itself cannot be exercised through the MCP role (no
  write on `vault.secrets`, even inside a rollback); it is a null check,
  read it rather than claim it tested.
- Live tick route: unauthenticated POST 401, wrong bearer 401, GET 405
  (verified against tryrun.today 2026-08-28). A hand-fired
  `select internal.routines_tick()` followed by a read of
  `net._http_response` for the returned id must show 200 and
  `{ran, failed, skipped}`.
- `service_role` CAN read `vault.decrypted_secrets`. That is Supabase's
  default and the role never leaves the server; note it, do not "fix" it.
- `pg_net` in `public` is a pre-existing advisor WARN older than 049
  (`create extension if not exists` was a no-op); moving it is its own
  migration and its own decision.

## Open items ledger (update as they close)

- Cron job existed only in the dashboard with its token inline: **FIXED
  2026-08-28** (migrations 049 + 050, Vault, pinned search_path). Cost: no
  routine ran from 2026-08-27 15:55 to 2026-08-28 ~20:30 SGT after a
  developer switched it off during a walkthrough. THE RULE: no clickops;
  the repo describes every job, bucket, policy and webhook the app relies
  on, and the first query of any routines session is `select active from
  cron.job`.

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
- No rate limit on the Telegram webhook's canned reply (found 2026-08-21).
  Any Telegram user who finds the bot makes us send one outbound message per
  inbound one. It costs nothing, Telegram throttles bots at its own end, and
  the reply is a fixed string that reaches no model, so this is egress driven
  by a stranger rather than an injection path. Cheap to bound if it ever
  matters; recorded so it is not re-found every sweep.
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
