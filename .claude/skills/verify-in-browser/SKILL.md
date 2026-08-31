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

## Signed-out pages without signing the founder out (2026-08-27)

Cookies are per host, not per port, so `http://127.0.0.1:3000` is a clean
signed-out visit while `localhost:3000` keeps the founder's session. Use it
for /login, /register and /forgot-password. Two traps found the slow way:

- **The dev server blocks it.** `next dev` refuses cross-origin dev resources
  from 127.0.0.1 (`allowedDevOrigins`), so the HTML renders but NOTHING
  hydrates: no click works, no effect runs, and there is no console error.
  Use a production build (`npm run build && npm run start`) for any
  behavioural check at 127.0.0.1; the perf gate wants one anyway.
- **`document.write` of fetched HTML does not hydrate either.** It shows the
  markup and nothing else; do not read behaviour off it.

## The automation tab can be hidden (2026-08-27)

Check `document.hidden` before trusting anything about motion or pointer
events. When the founder has another window in front, the tab reports
`hidden: true`: CSS animations and transitions freeze at `currentTime 0` and
report `running` forever, hover and click from the `computer` tool are not
delivered, but plain `setTimeout` timers still fire. Three symptoms that
each looked like a bug in the code and were not.

What still works from a hidden tab: dispatching DOM events from the
javascript tool (`el.click()`, `el.dispatchEvent(new MouseEvent('mouseover',
{bubbles: true}))`) reaches React's handlers, so handlers can be proven that
way. Read state one call LATER than the dispatch: React flushes after the
event, so a read in the same script returns the previous state.

Also: the tab's viewport can change size between batches (a 1456-wide
screenshot became 1512 mid-session). Coordinates from an older screenshot
miss small targets; click by `ref` from `find` for anything under 20px.

Before any of this, check what is on :3000. A `next start` left over from a
previous day's perf gate serves the OLD build and will not pick up edits;
`lsof -t -i :3000 | xargs ps -o command=` tells you which it is.

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

## Frame rate cannot be measured from the automation tab

Sampling `requestAnimationFrame` deltas here to judge whether an animation is
smooth gives a median of 33.3ms, which reads as a damning 30fps. The idle
baseline on the same page is also 33.3ms: Chrome caps this tab, and the number
describes the cap rather than the animation. Earlier the same day the same
probe returned 120fps, so it is not even stable between runs.

Two things follow. Never quote an fps figure taken from this tab. And when a
founder says something feels wrong, assess the STRUCTURE instead, which is
deterministic and does not need a clock: read `transitionProperty`,
`transitionDuration` and `transitionTimingFunction` off every element involved
and look for the real faults, which are usually several durations running at
once, a `linear` curve where the app uses an ease-out, layout properties being
animated, and `display: none` snapping where a fade was intended. That found
four separate faults in the sidebar collapse in one pass.

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

## Phone and tablet without the Chrome tool (2026-08-31)

`resize_window` lied again this session (fullscreen or not), and the Chrome
tool's wheel scrolling through Lenis is erratic: five ticks moved 500px one
moment and 4000px the next, so a frame you want is rarely the frame you get.
The instrument that works is puppeteer-core, already on the machine inside
the npx lighthouse cache (`~/.npm/_npx/*/node_modules/puppeteer-core`), driving
the installed Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google
Chrome`) against a PRODUCTION build on 127.0.0.1:3000:

- `setViewport({ width: 412, height: 823, isMobile: true, hasTouch: true })`
  and again at 1024 by 768; `goto(..., { waitUntil: 'networkidle0' })`.
- Scroll with `page.mouse.wheel({ deltaY })` in steps of 0.85 of the viewport
  with ~900ms waits, so Lenis and ScrollTrigger see real wheel events, and
  `page.screenshot()` at each stop. Collect `pageerror` and console errors.
- Stitch the stops into one contact sheet with PIL and read that, rather
  than thirteen images one at a time.
- Probe state with `page.evaluate` at the exact position you care about; the
  curtain bug this session (see the motion skill) was invisible in
  screenshots and obvious in `dataset.on`.

Do NOT use Lighthouse's full-page screenshot for layout: it stretches every
`100svh` section to the height of the whole document, so the hero alone
filled 9,700px and nothing below it was captured.
