---
name: supabase-ops
description: Apply Supabase migrations and design or debug RLS policies for Run. Use for any schema change, storage bucket work, or row-level-security question.
---

# Supabase operations for Run

Project ids, dashboard state, and test-account details live in the private
project memory (`run-project-state.md`), never in this file: the repo is
public.

## Migrations

- Files are numbered in `supabase/migrations/` (`NNN_name.sql`) and applied in
  filename order. Apply via the Supabase MCP `apply_migration` tool.
- FIRST verify the MCP session targets the right project with
  `get_project_url` and check it against the ref recorded in project memory.
  The same machine has an unrelated live project on the account; a stale MCP
  session can point at it.
- If the MCP route fails, use the Management API with curl
  (`api.supabase.com`); Python urllib is blocked by Cloudflare (error 1010).
- After any schema change, update the hand-authored `Database` type in
  `lib/types/database.ts`. Tables used in embedded joins
  (`select('*, agents(name)')`) MUST have `Relationships` FK metadata arrays
  or tsc rejects the join.

## Shipping a schema change with its code

Dev and prod are the SAME project, so a migration is live the moment it is
applied. For an additive nullable column that means: apply the migration
first, then merge the code that writes and reads it. The old code ignores a
column it does not know about, so the window between the two is safe; the
reverse order ships code that queries a column that is not there yet.

A new FK also needs its `Relationships` entry in `lib/types/database.ts`
before an embedded join will typecheck, and the join names the constraint
(`added_in:agents!knowledge_sources_source_agent_id_fkey(id, name)`) rather
than the table, because a table can reach the same table more than one way.

Backfill in the same migration, and say in a comment what the backfilled value
IS: `source_agent_id` is filled from each source's earliest link, which is the
creating agent, because creation attaches in the same action. A row with no
link keeps a null, and the UI omits the line rather than guessing.

## RLS design rules (each learned from a real bug)

- **RLS answers "who are you"; queries answer "what state".** Never let a
  row's mutable state gate visibility for the role that mutates it: Postgres
  re-checks new-row SELECT visibility on UPDATEs that read the table back.
- **Inserts that read the row back need SELECT visibility too.** Any insert
  with RETURNING, and every storage upload (the storage API reads the object
  row back), fails with "violates row-level security policy" if no SELECT
  policy covers the new row, even when the write policy passes. This bit us
  twice (migrations 007 and 013).
- **Service-role-only tables:** give them NO insert policy and write only via
  a service-role client
  (`createClient(url, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })`),
  as `lib/usage.ts` does. Keep such writes fire-and-forget and never throw.
- **Storage buckets** are created in SQL
  (`insert into storage.buckets (id, name, public) values (...)`), with write
  policies scoped by `(storage.foldername(name))[1] = auth.uid()::text` and an
  explicit SELECT policy for whoever must read the objects back.

## Probing RLS as a real user

Run this shape through `execute_sql` to test policies without the app:

```sql
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"<user-uuid>","role":"authenticated"}';
-- the query under test
rollback;
```

Caveats: only the LAST statement's result set is returned, and any error
aborts the whole batch, so probe one query at a time.

## Verification

A schema or policy change is not done until: the migration is applied, the
`Database` type compiles, an RLS probe passes for each affected role, and the
member 403 sweep still passes for any touched API route (see the phase-gate
skill).

## Scheduled jobs and secrets (added 2026-08-28)

- **A pg_cron job is a migration**, never a dashboard action. The routine
  heartbeat was created by hand on 2026-08-01 and switched off by hand on
  2026-08-27; nothing in the repo could show either. Migration 049 is the
  shape: `cron.schedule(name, schedule, 'select internal.fn()')`, which
  UPDATES an existing job of the same name (jobid preserved), so the
  migration is safe to re-apply.
- **The secret goes in Vault, read at run time.** `select
  vault.create_secret('<value>', 'name')` once, out of band, never in a
  migration; the function reads `vault.decrypted_secrets` by name and RAISES
  if the row is missing. Copy the value from wherever it already lives
  (`substring(command from 'Bearer ([0-9a-f]+)')` pulled it out of the old
  job) rather than retyping it. The MCP role cannot UPDATE `vault.secrets`,
  so a "secret missing" branch cannot be probed in a rollback; say so.
- **Functions cron runs live in `internal`**, a schema PostgREST does not
  expose, with `set search_path = ''` and fully qualified references. Check
  privileges with the TWO-argument `has_schema_privilege(role, ...)` form;
  the one-argument form reports the current role and reads as a false alarm.
- **`cron.schedule` inside `apply_migration` is blocked by the auto-mode
  classifier** (2026-08-01 and again 2026-08-28). Do not split the statement
  to slip past it. Write the file, ask the founder to press Shift+Tab out of
  auto mode and say retry, then apply the identical call. `alter function
  ... set search_path` was NOT blocked.
- Verify a job end to end with `select internal.fn()` (returns a pg_net
  request id), then `select status_code, content from net._http_response
  where id = <id>`; then wait for `cron.job_run_details` to show a
  `succeeded` row with the new command before calling it done.
