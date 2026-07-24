---
name: pause
description: End-of-session ritual for Run. Use when the user says "let's pause", "wrap up", or otherwise ends a work session, so the session's work is logged, synced, and pushed.
---

# Pause: end the session cleanly

The user wants a permanent, plain-English record of every session so anyone
(including a future session) can pick up exactly where work left off. Run all
steps; none are optional.

## 1. Progress log

Append a dated entry to `PROGRESS.md` at the repo root, newest first:

- Point-by-point plain English: what was built, what was verified (with the
  evidence, e.g. "verified live with a run per output type"), what broke and
  how it was fixed, and any deviations from the spec with the reason.
- If work was merged, name the pull request ("Merged to `main` via pull
  request #N.").
- Update the "Where we left off" header to the true current state and the
  concrete next step.
- Style: no em dashes anywhere in this file or any Run write-up. No secrets,
  no test credentials, no internal-only plan details; the file is public.

## 2. README sync

If phase or feature status changed this session, update the README's project
progress section to match. README and PROGRESS.md must never disagree.

## 3. Commit and push

Commit the log (plus any straggler work the user approved) and push, so
GitHub reflects the session. Never push anything from `docs/` except
`styleguide.md`; the rest is git-ignored internal material.

## 4. Memory

Update the auto-memory file `run-project-state.md` with anything a future
session needs that the public log cannot hold: project refs, account ids,
live-state details, credentials pointers, lessons learned. Keep its MEMORY.md
index hook current.

## 5. Hand-off sentence

End the reply with one sentence stating where work stopped and the next step,
matching what "Where we left off" says.

## Loose ends checklist

Before finishing, tell the user about anything left running or half-open:
dev server state, browser sessions signed in or out during testing, unmerged
branches, test data created, and anything only they can do (e.g. deleting
remote branches, since destructive git pushes are user-owned).
