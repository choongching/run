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

## 2. API surface (behavior probes)

Unauthenticated curl on EVERY route in `app/api` (all methods): expect 401
(405 where the method does not exist). Then
`grep -rL "requireUser\|getUserIdentity" app/api --include=route.ts` must
return nothing, and every file in `app/actions` must check identity.
Rate backstop and run allowance both 429 on the message route; uploads
validate kind and size server side and pass the credential-scan gate.

## 3. RLS (probe, do not trust files)

Confirm the MCP session targets the right project first (supabase-ops skill).
Then: pg_class join pg_policy for RLS-enabled + policy count on every public
table; pg_policies for per-command coverage; and the behavior probe: as an
unrelated authenticated sub and as anon,
`select count(*)` on user_connections, usage_events, agent_knowledge,
knowledge_sources, messages, threads must all be 0. Run
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
- Secrets: `git config core.hooksPath` is `.githooks`, private-patterns file
  present (git-ignored; recreate from private memory on a fresh clone).
- Full CSP is deliberately deploy-day work; do not bolt one on quickly.

## Open items ledger (update as they close)

- Migration 033+034 (RPC lockdown + avatar listing scope): APPLIED
  2026-07-31, verified via has_function_privilege + RLS probe.
- Leaked-password protection: PLAN-GATED (no toggle on Free, verified
  2026-07-31). Closes with the plan-tier upgrade, required before open
  signup.
- Drive approval-card name resolution: founder undecided.
- Gmail OAuth scope too broad (found 2026-08-01 answering a user's
  injection question): the Pipedream Gmail connector's grant includes
  gmail.send, gmail.modify, gmail.settings.basic. No code path uses them,
  but the permission exists, so the provider layer is not a backstop.
  Narrow via reduced connector scopes or our own Google OAuth client (which
  the Google verification long pole needs anyway). Published in the
  README's Security FAQ; do not claim Google would refuse until fixed.

## Report

Checklist with pass/fail and one line of evidence each, findings ranked,
fixes shipped separately from findings that need the founder's decision.
