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
- TRAP: more than one dev server can be alive at once. A zombie holding :3000
  serves STALE COMPILED CODE while the new one lands on :3001, and the symptom
  is a change that half works or a bug that makes no sense. Check
  `lsof -i :3000 -i :3001 | grep LISTEN` before diagnosing anything strange,
  and `pkill -f "next dev"; pkill -f "next-server"` before starting a new one.
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

## A blank screenshot is not evidence (2026-08-26)

Hit twice in one session, and it nearly became a hunt for a bug that did not
exist. For several seconds after a recompile the Chrome tool captures an empty
page while the DOM is entirely correct: the `h1` was present, `opacity: 1`,
laid out at the right coordinates, with the rail's six pills and a correct
mask string.

**Read the DOM before concluding the page is broken.** One `javascript_tool`
call answers it:

```js
const h1 = document.querySelector('h1')
JSON.stringify({ text: h1?.innerText.slice(0, 40), rect: h1?.getBoundingClientRect(),
                 opacity: h1 && getComputedStyle(h1).opacity })
```

If the element is there with real geometry, the capture is the problem, not
the code. Take another screenshot rather than editing anything.

## Click small targets by ref, not by coordinate

Coordinates in a `browser_batch` refer to the screenshot taken BEFORE the
batch, and the page moves between the two: an entrance animation settles, a
sticky thread scrolls, a card re-renders taller. A 24px target (a stepper pip,
a kebab, a chip) misses again and again and reads as "the button does not
work". `read_page` with `filter: "interactive"` then `computer` with
`ref: "ref_12"` hits it the first time, and the accessible name in that
listing doubles as an a11y check: an unnamed `radio` in the tree is a real
defect, not a tooling artefact.

## Narrow-width (mobile) checks

- `resize_window` LIES in macOS fullscreen: it reports success while the
  window stays put. Have the user exit fullscreen first, then ALWAYS
  confirm with `window.innerWidth` via the javascript tool before trusting
  any responsive screenshot.
- The iframe workaround does not exist either: our own security headers
  send `X-Frame-Options: DENY`, so framing a route at 390px inside the page
  renders nothing, and `window.open` at a set size is popup-blocked. READ
  THIS SECTION BEFORE TRYING; it was rediscovered the slow way on 2026-08-25.
- Even windowed, macOS Chrome will not go below ~500px wide, so true
  phone width (412) is unreachable here; below-md behavior is testable,
  exact phone layout is not. The founder's real device is the standing
  gate for keyboards, safe areas, and tap feel: emulation lies about all
  three.

## Verify what you did not change

For anything touching the shell, `globals.css`, or a `components/ui/` primitive,
open every route (`/`, `/chat/[id]`, `/knowledge`, `/connectors`, `/settings`),
not just the one being worked on. A shared style can apply on one route and
silently fail on the rest, and the route you are staring at is often the one
that happens to work. See the phase-gate skill for the specificity trap behind
this.

Zoom into corners and edges rather than judging from a full screenshot. Shadow,
radius and hairline differences are invisible at page scale and obvious at 4x.

## Evidence and cleanup

- Record with `gif_creator` (start_recording -> actions -> stop_recording ->
  export `download: true`) and name the file for the change.
- After: `read_console_messages` with `onlyErrors: true` (expect none).
- Creating an agent makes REAL Anthropic + Supabase rows. Sweep test data back
  to the demo trio when done (see the `dev-cleanup` skill).
- There is a per-account agent cap, so a second test build fails with "Delete an
  agent to make room for a new one". Delete the previous test agent through the
  app (Configure panel, Delete agent), not with SQL: a `delete from agents` is
  blocked by the permission classifier, correctly, and the app's own path is
  the one users take anyway. Never delete an agent you did not create in this
  session, and check `routines` for it first.
- Testing a full setup interview costs about five runs off the monthly meter,
  so plan the run rather than repeating it idly. The founder often takes over
  the test agent mid-flow; ask before cleaning up anything they touched.
