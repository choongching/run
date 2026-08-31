---
name: perf-audit
description: Audit or improve page load, navigation, or perceived speed in the Run app. Use when anything "feels slow", before quoting any timing, or when adding data fetching to a layout or page.
---

# Speed audits for Run

Two passes (2026-07-28 and 07-30) took first paint from most of a second to
about 30ms. Every rule here was paid for with a measurement.

## The standing gate (run it, do not wait to be asked)

`node scripts/perf-check.mjs` against a running server; `--prod` against a
production build enforces budgets (public TTFB 150ms, proxy redirects 60ms,
biggest chunk 350KB, total client JS 2.5MB, set from 2026-07-30 baselines
with headroom). It also audits the signed-out redirect graph: exactly one
local hop to /login from every gated route, no chains, no 200s. This runs as
part of phase-gate on every phase end.

The browser half, for what needs a session (do after any change to a layout,
a page's data fetching, or navigation):

1. First paint per route via the RSC first-chunk timing below; budget 100ms
   prod against the ~30ms baseline.
2. Nav clicks to Knowledge/Connectors: zero fetches at click time (they are
   prefetched); chat clicks are allowed their one fetch, by design.
3. New client components: justify each against the zero-JS default.

## Measure before touching anything

- **Production build only.** Prefetching does not exist in dev, so dev clicks
  feel far worse than prod and any dev number is unquotable. `npm run build &&
  npm run start`, then measure. Restart the dev server when done.
- **Page timing from the browser tab** (the session is signed in there;
  curl is not): fetch with the RSC header and split first byte from full:
  ```js
  const r = await fetch(route, { headers: { RSC: '1' }, cache: 'no-store' })
  const reader = r.body.getReader()
  await reader.read()                    // first chunk = the shell
  // drain the rest = fully streamed
  ```
  First byte is what a person sees paint; the drain is when data lands.
- **Click timing**: poll for the destination's h1 after `el.click()`, with a
  deadline, and count fetches via the resource timing API. A bare
  `location.pathname` check lies; it flips before content renders.
- Median of 5 to 8 runs; the first is always a cold outlier.

## The rules the passes established

- **A layout must await nothing.** A layout blocks everything inside it,
  including every page's own loading.tsx. Data-dependent parts of the shell
  are async server components in their own Suspense slots (see
  `components/sidebar/sections.tsx`); they still run concurrently.
- **Identity is local.** `getClaims` (ES256, WebCrypto, ~12ms), never
  `auth.getUser()` (network, measured 123 to 651ms). Pages use
  `getUserIdentity`; only callers that truly need the profile row use
  `getUserProfile`. `requireUser` already does this; keep it that way.
- **One Supabase client per request.** `createClient` is React-`cache()`d;
  a second client re-fetches the JWKS before it can verify anything.
- **One round trip per page.** Embedded FK joins fold a dependent query into
  its parent (chat folds messages into the thread read). The `Database` type
  needs the `Relationships` metadata for the join to typecheck.
- **Prefetch is opt-in per link and data-safety is the criterion.** Knowledge
  and Connectors prefetch (small, stable, revalidated on mutation). Chat
  links MUST NOT prefetch and no global `staleTimes` may be set: a cached
  chat freezes its server-rendered message list, so a reply would vanish on
  back-navigation. Making chat client-fetched is the recorded design change
  if that ever needs to move.
- **Perceived speed counts as speed.** A server-action form with no pending
  state reads as broken for the whole round trip; `useFormStatus` on the
  submit button (see `components/auth/submit-button.tsx`) is the fix. Same
  family: autocomplete hints so password managers fill instantly.

- **Ownership checks gate the response, not the queries.** When every query
  in a route is RLS-scoped, run the ownership check and the data load in one
  Promise.all and discard on failure; serial was the whole open latency of
  the config panel (A/B measured 467ms to 341ms, one ~120ms round trip).
- **A/B on the live route with git stash.** Measure the new code, `git stash`
  the change, measure again from the signed-in browser tab (median of 6,
  discard the cold first), `git stash pop`. The only honest before/after on
  a dev server.
- **Every poll dies with its component, and rechecks on `visibilitychange`.**
  Earned 2026-08-21, when two of four connect polls turned out to start their
  interval inside a click handler and clear it only from inside their own
  callback. Navigating away mid-connect left them hitting a Pipedream-backed
  route every 2s for the full three minutes and setting state on an unmounted
  component. An effect must own the loop, driven by state, so unmount kills it.
  The second half matters more to what a person feels: every one of these flows
  sends them to a popup or their phone, and Chrome throttles a hidden tab's
  interval to roughly once a minute, so "this updates itself" can idle long
  after they finished. Rechecking when the tab is revealed makes coming back
  instant. Also skip a tick while a check is still in flight, or slow calls
  stack. One shared hook: `lib/use-connect-poll.ts`; add call sites to it
  rather than hand-rolling a fifth.
- **Markup-only refactors do not move server timings, and if they seem to,
  measure again before believing it.** The page-container refactor rewrote the
  containers of six surfaces and changed no query; the numbers still appeared
  to move by 300ms in both directions until the sample size went up. Check
  what the change could physically affect before hunting for a cause.
- **Grep every timer as its own pass.** `setInterval`/`setTimeout` across
  `components` and `app` is a ten-second sweep that no page-timing number will
  ever surface, because a leaked interval costs nothing on the page you are
  measuring and everything on the one you left.
- **Anything rendered per streaming frame memoizes derived work.** The chat
  thread re-renders every message component on every frame of a live turn;
  a regex or transform over full message/document content must be useMemo'd
  (the ArtifactCard cite-strip was re-regexing a whole document per frame).
- **prose does not read the type tokens.** Typography-plugin containers
  hardcode their font-size; a token-variable rescale needs a companion
  `.scope .prose { font-size: var(--text-sm) }` rule (see run-chat-type in
  globals.css), and em-based prose internals then follow.

## Production baselines (Vercel sin1, measured 2026-07-31 from Singapore)

`node scripts/perf-check.mjs --prod --base https://<site>` runs the standing
gate against the deployed site. Baselines, all budgets passing: public pages
55-76ms TTFB, signed-out redirects 28-36ms, signed-in RSC first chunk
70-92ms on every route (chat the heaviest at 92), fully streamed 220-420ms,
prefetched nav clicks 0 fetches and ~130ms to the destination heading. The
220-420ms drain is the ~120ms Supabase floor stacking, not app code; do not
chase it until the plan-tier question is answered.

## Baselines, localhost production build (2026-08-21, re-measured at close)

Not comparable to the Vercel numbers above (no network hop), but useful as a
same-machine before/after. Signed in, production build, dev server STOPPED,
16 samples per route with the cold run discarded:

| Route | First chunk | Full stream (median) | p90 |
| --- | --- | --- | --- |
| `/chat` | 15ms | 394 | 404 |
| `/routines` | 23ms | 206 | 414 |
| `/knowledge` | 24ms | 215 | 242 |
| `/settings` | 26ms | 332 | 419 |
| `/connectors` | 29ms | 372 | 537 |
| `/` | 30ms | 341 | 532 |

`perf-check --prod` green, biggest chunk 273KB, total client JS 1.8MB.

**READ THE FULL-STREAM COLUMN WITH SUSPICION, and this is the lesson of the
day.** That distribution is fat-tailed, not normal: sixteen samples of
`/connectors` came back 195, 205, 209, 209, 210, 210, 212, 217, 225, 246, then
371, 379, 389, 408, 479. Two clusters, one at the ~200ms the page really costs
and one at roughly double it. A median of six therefore lands wherever the
tail fell, and the same route measured twice ten minutes apart gave 212 and
372. The earlier single-run table in this file (connectors 196, knowledge 359)
was one draw from that distribution quoted as a fact.

So: **at least 15 samples, quote the median AND the p90, and never read a
±150ms move on this machine as a change.** The tail is the ~120ms Supabase
round trip jittering, not app code. First chunk is the stable number and the
one worth defending; it stayed in band through a refactor that touched every
standard page.

Second thing worth carrying: **run the gate with the dev server stopped.**
Leaving `next dev` running beside `next start` added roughly 10ms to the first
chunk of every route, uniformly, which is enough to look like a regression.

## Baselines, the auth pages (2026-08-28, production build, dev server stopped)

Measured after the two-column sign-in shipped (form left, a chat-story panel
right, a page-load reveal). Public pages, so measured from a SIGNED-OUT tab at
`127.0.0.1:3000` (cookies are per host; see the verify-in-browser skill for
why that needs a production build). 16 samples each, cold run discarded:

| Route | First chunk (median / p90) | Full stream (median / p90) |
| --- | --- | --- |
| `/login` | 8 / 10ms | 9 / 10ms |
| `/register` | 4 / 5ms | 5 / 6ms |
| `/forgot-password` | 4 / 5ms | 4 / 6ms |

First chunk equals full stream because these pages make no Supabase call on
render; the proxy's local getClaims is the only server work. Keep it that
way: the redesign added zero server-side calls, and that is the number to
defend if anyone proposes a "recent activity" or "who else is here" widget
on the door.

Page weight on `/login`: document 8KB, CSS 25KB, 13 scripts 190KB transfer,
fonts 53KB, backdrop 70KB (the 2200px WebP, chosen by `sizes` at this width;
a phone would get the 18KB one but has no panel at all). DOMContentLoaded
55ms, load 127ms, zero long tasks during load. Gate: TTFB 5 to 7ms, biggest
chunk 275KB (was 273 before the branch), total client JS 1.9MB.

The showcase is one client island of about 11KB gzipped, with two timers,
both owned by effects and cleared on unmount. Idle check at 25s with the tab
VISIBLE: our running animations 0, infinite animations 0. The one entry
`document.getAnimations()` returns forever is `claude-pulse`, which is the
Claude in Chrome extension's own and not on the page; filter it out before
reading the count, or the audit fails on a tool artefact.

**Read the infinite-animation check from a visible tab.** A hidden tab
freezes every CSS animation at `currentTime 0` and reports it `running`, so
the same probe on a hidden tab says everything is running forever.

## The chat turn, measured (production, 2026-08-21)

Page timings say nothing about a chat turn. Measure it by wrapping `fetch` and
timestamping NDJSON frames from `/api/chat/[agentId]/message`, reading a
`res.clone()` so the app's own stream is untouched. Persist to `localStorage`
per frame: the first version of this probe lived in page memory and lost a real
measured turn when the tab closed. It only records in the page it was installed
in, so it must be installed in the tab the message is sent from.

Before the `thinking` frame shipped, first byte was 2,869ms on a bare "hi" and
4,590ms three turns later in the same thread, with nothing on screen for the
whole wait. **Time to first byte grows as a conversation ages**, because the
model reads more context before its first token, so the silence widens exactly
as a thread becomes worth having.

After: first byte **1,102ms**, total unchanged at 6,295ms. The fix makes
nothing faster; it makes the wait visible.

**The split, now visible from the gap between `thinking` and `start`:**

| Segment | Cost | Ours? |
| --- | --- | --- |
| Pre-stream serial DB round trips | ~1,100ms | yes, recoverable |
| Session setup + model time to first token | ~3,900ms | no |
| Streaming the reply | ~1,300ms | no, and healthy |

Streaming is not a problem and never was: no gap over 530ms before the fix,
median around 200ms, no stall over a second in any turn measured.

**COSTED OPEN ITEM.** The ~1,100ms is four to five serial Supabase round trips
in the message route before the stream opens: a thread read, `ensureEnvironment`,
a message insert and a thread update, each paying the ~120ms floor. Collapsing
them is worth about a second off EVERY turn. The price is that pre-stream HTTP
error responses become error frames, on the hottest path in the product. Do it
deliberately or not at all, and re-run this probe to prove it.

## Measuring an animation, not arguing about it (2026-08-26)

Page timings say nothing about whether an animation is expensive, and the
instinct to memoize "just in case" produces a `memo` that reads as a claim
about a problem nobody measured. Sample frame gaps from the signed-in tab
instead:

```js
const lt = []
new PerformanceObserver((l) => l.getEntries().forEach((e) => lt.push(Math.round(e.duration))))
  .observe({ entryTypes: ['longtask'] })
// collect requestAnimationFrame deltas for 6 to 8s, then report
// median, p95, worst, and how many gaps exceed 20ms
```

Measured on the home composer with the placeholder typing (about 26
re-renders a second, each re-rendering the six-pill rail beneath it) and again
with the border drifting a masked conic gradient: **120fps, zero dropped
frames, zero long tasks** in both windows. So `JobRail` is deliberately NOT
memoized, and the reason is written where the temptation is.

**Then the founder's laptop fans overturned that conclusion the same evening,
and the correction is the more useful half.** Re-running the probe with the
border drift injected and removed gave IDENTICAL numbers, 120fps and nothing
dropped either way. Frame pacing is not what an ambient animation costs. What
it costs is that the page never goes idle: one infinite animation pins the
compositor and a 120Hz display at 120 frames a second for as long as the tab
is open, and because there is headroom the whole time, the smoothness metric
stays perfectly clean. Both drifts were cut and the app now has no perpetual
animation anywhere.

So the probe above answers "does this animation stutter", which is a real
question. It does not answer "does this animation cost anything", and it must
never be quoted for the second. For that:

```js
document.getAnimations().filter(a => a.effect.getTiming().iterations === Infinity)
```

after the arrivals have finished. Empty is the pass. Anything in there is a
battery bill however smooth it measures. (`claude-pulse` is the Claude in
Chrome extension, not ours.)

**And take a null reading before trusting any of it.** Sampling frame times
from the Chrome automation tab gave a median of 33.3ms during a collapse,
which reads as a damning 30fps; the idle baseline was also 33.3ms, so the
number was that tab's cap and said nothing at all. One measurement of nothing
happening catches this before it becomes a conclusion. See the
`verify-in-browser` skill for what to read instead.

The general rule: an animation's cost is a measurement, the measurement is
cheap, and the measurement is only worth having once you have proved it can
tell the two cases apart.

## Baselines, localhost production build (2026-08-26, home composer work)

Same method as the table above (production build, dev server stopped, 16
samples, cold run discarded), after the typed placeholder, the scrollable job
rail and two border animations shipped:

| Route | First chunk | Full stream (median) | p90 |
| --- | --- | --- | --- |
| `/` | 15ms | 353 | 501 |

Down from 30ms in the 2026-08-21 table, and the bundle did not move at all:
biggest chunk 273KB, total client JS 1.8MB, both identical before and after.
A hook and a component of this size cost nothing measurable in JS weight, so
"is it worth the bundle" is not the question to ask about one; whether it
earns the screen is.

## Images: the weight is in the noise, not the pixels (2026-08-26)

The home backdrop is a 5000x3334 photograph of a textured wall. Encoded
straight it is 216KB at 2000px wide, and the size is almost all the wall's
grain, which is noise no encoder can compress. **A 1.2px blur BEFORE encoding
takes it to 70KB and is invisible at display size**, because the image is
downscaled again by the browser; blur 2 takes it to 31KB. Try that before
reaching for a lower quality setting, which softens the shapes you care about
while leaving the noise.

```js
sharp(src).resize({ width: 2200 }).blur(1.2).webp({ quality: 60, effort: 6 })
```

Ship the sizes by hand with a plain `<img srcSet sizes>` rather than
`next/image` when the asset is fixed and already tuned: the optimizer would
re-encode a file you shaped deliberately and bill a transform for it, and
`next/image` with `unoptimized` cannot emit a srcSet at all, so the small
variant would be dead weight. Disable the `no-img-element` lint inline with
that reason. Decorative images take an empty alt, no pointer events, and
`fetchPriority="low"` so they cannot compete with the headline.

AVIF is not automatically smaller. On this picture WebP beat it at every
quality tried, because fine noise is where AVIF's advantage disappears.

## Known floors (do not chase these in code)

- **~120ms per Supabase request, flat.** Proven with a no-op
  `/auth/v1/health` timing identical to a one-row read; edge and database are
  both in Singapore (7ms ping, 0.27ms query). Likely the plan tier. The
  founder checks the plan before anyone writes a consolidation RPC.
- **264 to 491ms for a password grant.** bcrypt is deliberately slow. Fix
  feel, not the grant.
- **Static /login is a dead end** (needs cacheComponents, fails the build).
  Recorded 2026-07-28; do not retry without budget.

## Done means

Numbers from a production build, before and after, quoted in the commit
message; dev server restarted; and any new rule earned goes into this file.

## An unattended job has its own timing table (2026-08-28)

Page probes cannot see the routine heartbeat. Its cost lives in
`cron.job_run_details`: `end_time - start_time` per run, grouped by
`command`, which also gives an honest before/after when the command
changes. Reading the bearer token from Vault inside a function (migrations
049 + 050) versus the token pasted inline: p50 17.0ms to 18.5ms, p90 32.6ms
to 34.0ms over 521 and 8 runs, 0 failures either way. That 1.5ms is the
whole price of not having a secret in the job text. The tick itself is one
`net.http_post` with an 8s timeout; the route's own work is bounded by
`TIME_BUDGET_MS` (240s) inside a 300s function ceiling, which is where a
thundering-herd of routines would show up first, as latency of the last
routine in the batch rather than as a failure.

And the standing gate is the right thing to run even when no app code
changed: `perf-check --prod --base https://tryrun.today` on 2026-08-28 was
green (TTFB 73 to 90ms, redirects 32 to 45ms, chunk 275KB, JS 1.9MB), which
proves the branch touched nothing it should not have.

## Lighthouse, the recipe that worked (2026-08-31)

Run it against `npm run build && npm run start` on 127.0.0.1:3000 with the
dev server killed first (the `.next` trap in verify-in-browser). Set
`CHROME_PATH` to the installed Chrome. `npx --yes lighthouse <url> --quiet
--chrome-flags=--headless=new --only-categories=performance,accessibility,
best-practices,seo` with `--preset=desktop` or `--form-factor=mobile`;
`--screenEmulation.width=1024 --screenEmulation.mobile=false` gives a tablet.
TRAP: `--output=json --output-path=x.json` still wrote the HTML report; the
LHR is embedded in it after `window.__LIGHTHOUSE_JSON__ = ` up to
`;</script>`, and `fullPageScreenshot` is a top-level key, not an audit.

Landing page, 2026-08-31: desktop 100 / 96 / 100 / 100, phone 92 / 96 / 100 /
100. Three findings were real and fixed, one pattern each:

- **An LCP element you cannot see.** The curtain wordmark, fixed behind the
  page, was the largest paint. Anything painted at load and covered counts;
  hide it (`visibility: hidden`) until it can be seen.
- **Media below the fold loading with the hero.** The closing banner's 1.1MB
  film. `HeroMedia` has a `lazy` prop that waits for an IntersectionObserver
  with `rootMargin: '100% 0px'`; use it for any footage not in the first
  screen. 3.6MB to 2.45MB on arrival.
- **An entrance floor that fails contrast.** Headings at 40% opacity before
  the first scroll read as 2.4:1; 60% clears AA for headings. Muted body
  text at 60% is still 2.2:1 until the scroll; accepted and written down.

Known floor: the phone's 3.3s LCP is now the nav text, which is hydration on
the 4x throttled CPU. Do not chase it in the landing code.
