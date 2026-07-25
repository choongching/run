---
name: verify-in-browser
description: Run the dev server and verify a change live in Chrome (log in, drive the UI, record a GIF, check the console). Use to visually confirm a phase before shipping.
---

# Verify in the browser for Run

The founder values live verification of each phase. This is the loop.

## Dev server

- Start with `npm run dev` as a BACKGROUND task (it runs across turns).
- TRAP: do NOT `rm -rf .next` while a dev server is running; it keeps the port
  open but stops serving (curl hangs / returns 000). `npm run build` also
  rewrites `.next`. If you cleared `.next` or built, KILL and restart dev
  (`pkill -f "next dev"; pkill -f "next-server"`), then start fresh.
- Wait for ready by polling (foreground `sleep` is blocked, so loop):
  `for i in $(seq 1 40); do code=$(curl -s -m 5 -o /dev/null -w "%{http_code}"
  http://localhost:3000/login); [ "$code" = 200 ] && break; sleep 2; done`.
  Trust the curl code, not the background task's "failed exit 1" status.

## Browser

- Chrome tools may be deferred: load the core set with ONE `ToolSearch`
  (`tabs_context_mcp,navigate,computer,read_page,tabs_create_mcp`,
  `browser_batch`, `gif_creator`, `read_console_messages`). Add `form_input`
  etc. in the same call if needed.
- Call `tabs_context_mcp` first. Reuse the tab created earlier in THIS session;
  otherwise create one. Never reuse a tab id from a prior session.
- Log in at `/login` as the dev admin (Ada Admin). Credentials live in project
  memory (`run-project-state.md`), never in this public skill. The session
  usually persists, so you may already be signed in.
- HYDRATION: after typing into a field, take a screenshot to confirm the text
  landed before submitting; React may not have hydrated when you first click.
- Batch predictable sequences with `browser_batch` (click, type, wait,
  screenshot); coordinates refer to the screenshot taken BEFORE the batch.
- A model turn takes seconds; `wait` 6-10s between an action and the screenshot
  that checks its result.

## Evidence and cleanup

- Record with `gif_creator` (start_recording -> actions -> stop_recording ->
  export `download: true`) and name the file for the change.
- After: `read_console_messages` with `onlyErrors: true` (expect none).
- Creating an agent makes REAL Anthropic + Supabase rows. Sweep test data back
  to the demo trio when done (see the `dev-cleanup` skill).
