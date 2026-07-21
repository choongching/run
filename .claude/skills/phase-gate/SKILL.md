---
name: phase-gate
description: Run the full phase-end verification gate for the Run app. Use when a phase is finishing, or when asked "are we done" / to review or verify completed work.
---

# Phase Gate for Run

The complete verification ritual that must pass before a phase is declared
done. Run every step; report results as a plain checklist with pass/fail per
item. Do not trust memory or prior claims, re-verify against the live app.

## 0. Scope check

Read the current phase's bullet list AND the Test Plan section in
`docs/development-roadmap.md` (local-only file, it is git-ignored). Audit every
bullet against the actual code first: files exist, routes exist, guards called.

## 1. Static gate

```bash
npm run lint
npx tsc --noEmit
```

Both must be clean.

## 2. Dev server

Check it is up before browser work:
`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
A daemonized `npm run dev` can show "failed exit 1" as background status while
serving fine; trust the curl result. Expect 307 (redirect to login) or 200.

## 3. Route protection matrix (unauthenticated)

Use this exact zsh-safe loop (list after `in`, quoted URL):

```bash
for p in / /missions /usage /dashboard /admin/agents /admin/company /admin/users /admin/integrations /login /register; do
  loc=$(curl -s -D - -o /dev/null "http://localhost:3000$p" | awk 'NR==1{code=$2} tolower($1)=="location:"{l=$2} END{print code, l}' | tr -d '\r')
  echo "$p -> $loc"
done
```

Expected: every protected route 307s to `/login`; `/login` and `/register`
serve 200. Add any routes the current phase introduced.

## 4. Browser smoke test (roles)

Credentials: use the dev test accounts recorded in the project memory file
`run-project-state.md` (never write credentials into this skill, the repo is
public). Batch all browser actions with `browser_batch`.

1. `tabs_context_mcp` first. If the tab is signed in as the user's personal
   account, note it, because you will be signing it out.
2. Visit `/login` while authenticated: must bounce into the app.
3. Sign out: must land on `/login`.
4. Sign in as the MEMBER test account: lands in the app, sidebar shows NO Admin
   section.
5. Navigate directly to an admin URL (e.g. `/admin/agents`): must redirect away.
   Route-level enforcement, not just hidden UI.
6. Sign in as the ADMIN test account if admin-only features need exercising
   this phase; verify the Admin nav renders and admin pages load.
7. Exercise this phase's new feature flows per the roadmap Test Plan.
8. `read_console_messages` with `onlyErrors: true`: must be empty.
9. Leave the browser signed out, and tell the user if their personal session
   was signed out during testing.

## 5. Report

Give the user a checklist: each gate item, pass/fail, with one line of
evidence. If anything failed, the phase is NOT done; say so plainly with the
failing output. Loose ends that are not blockers (unpushed branches, leftover
test data) go in a separate short list.
