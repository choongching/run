---
name: phase-gate
description: Run the full phase-end verification gate for the Run app. Use when a phase is finishing, or when asked "are we done" / to review or verify completed work.
---

# Phase Gate for Run

The complete verification ritual that must pass before a phase is declared
done. Run every step; report results as a plain checklist with pass/fail per
item. Do not trust memory or prior claims, re-verify against the live app.

## 0. Scope check

Read the current phase's bullet list in `docs/revamp-2026-07-25-plan.md` (the
active plan; local-only, git-ignored) and judge acceptance against the base
journey in `docs/revamp-happy-path-2026-07-25.md`. (`docs/development-roadmap.md`
is the superseded pre-revamp roadmap; do not use it.) Audit every bullet against
the actual code first: files exist, routes exist, guards called.

## 1. Static gate

```bash
npm run lint
npx tsc --noEmit
```

Both must be clean.

**NEVER run prettier.** The repo has no prettier config, and its own style is
single quotes with no semicolons. Running it reformatted 554 lines of
`lib/chat/run-turn.ts` in a change that touched three of them, and the only way
back was `git checkout` plus reapplying every edit by hand. `npm run lint` is
the formatter of record; there is no format script on purpose.

## 2. Dev server

Check it is up before browser work:
`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
A daemonized `npm run dev` can show "failed exit 1" as background status while
serving fine; trust the curl result. Expect 307 (redirect to login) or 200.

## 3. Route protection matrix (unauthenticated)

Use this exact zsh-safe loop (list after `in`, quoted URL):

```bash
for p in / /knowledge /connectors /settings /login /register; do
  loc=$(curl -s -D - -o /dev/null "http://localhost:3000$p" | awk 'NR==1{code=$2} tolower($1)=="location:"{l=$2} END{print code, l}' | tr -d '\r')
  echo "$p -> $loc"
done
```

Expected: every protected route 307s to `/login`; `/login` and `/register`
serve 200. `proxy.ts` guards all non-static routes with a catch-all matcher.
`/chat/[agentId]` is dynamic (needs a real agent id), so it is exercised in the
browser smoke test below, not this loop. Add any routes the current phase
introduced.

There is no admin surface any more. `/admin/*` and the role-gated pages were
deleted when setup became self-serve, so a phase that adds "admin only"
anything is a design question to raise, not a route to test.

## 4. Browser smoke test

Credentials: use the dev test accounts recorded in the project memory file
`run-project-state.md` (never write credentials into this skill, the repo is
public). Batch all browser actions with `browser_batch`.

1. `tabs_context_mcp` first. If the tab is signed in as the user's personal
   account, note it, because you will be signing it out.
2. Visit `/login` while authenticated: must bounce into the app.
3. Sign out: must land on `/login`. Sign back in as the dev test account.
4. Exercise this phase's new feature flows per the plan's phase bullets and the
   happy-path journey.
5. Ownership, where the phase touched anything owned: a non-owner must see no
   control that would fail on submit. The server scoping the write is not
   enough, an affordance that silently does nothing is a bug.
6. `read_console_messages` with `onlyErrors: true`: must be empty.
7. Leave the browser signed out, and tell the user if their personal session
   was signed out during testing.

Entitlements replaced roles: what someone can do is a plan limit, not a rank.
If a phase adds a limit, verify it twice, once in the UI (the control disables
with a reason) and once by the server refusing, because a disabled button is a
courtesy and not a control.

## 4b. Verify the pages you did NOT change

Mandatory whenever a change touches the shell, `globals.css`, a `components/ui/`
primitive, or anything shared across routes. Learned the hard way on
2026-07-28, twice in one session.

Walk every route (`/`, `/chat/[id]`, `/knowledge`, `/connectors`, `/settings`)
and compare the surface you changed. A shell change that looks right on the
page you were working on can be silently absent everywhere else.

The specific trap: a rule in `globals.css` targeting `[data-slot="sidebar-inset"]`
LOSES to the component's own `md:peer-data-[variant=inset]:*` classes, which are
a compound selector with a sibling combinator and outrank a plain attribute
selector. The override applies nowhere, silently, and no build or lint catches
it. The chat route was the exception only because `ConfigDock` sets the classes
directly on its own cards, so the one page being checked was the one page immune
to the bug.

When an override does not take:
- fix it at the source (edit the class list in `components/ui/`), do not build a
  specificity ladder to cancel a class
- then re-check a route that does NOT set the class directly

## 4c. Dev server hygiene before diagnosing anything

A "bug" that makes no sense is often a stale server. Before spending a single
round on a mystery:

```bash
lsof -i :3000 -i :3001 | grep LISTEN
```

More than one `next dev` can be alive at once: a zombie holding `:3000` and
serving stale compiled code, with the new one quietly on `:3001`. On
2026-07-28 this cost two rounds on a toggle that "worked one way but not the
other". Kill both (`pkill -f "next dev"; pkill -f "next-server"`) and restart
before concluding the code is wrong.

## 5. Report

Give the user a checklist: each gate item, pass/fail, with one line of
evidence. If anything failed, the phase is NOT done; say so plainly with the
failing output. "It looked right on the page I was working on" is not
evidence; say which routes were actually opened. Loose ends that are not blockers (unpushed branches, leftover
test data) go in a separate short list.
