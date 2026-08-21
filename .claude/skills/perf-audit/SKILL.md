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

## Baselines, localhost production build (2026-08-21)

Not comparable to the Vercel numbers below (no network hop), but useful as a
same-machine before/after. Median of six, cold run discarded, signed in:
RSC first chunk 16-21ms on every route including chat. Fully streamed:
`/routines` 191, `/connectors` 196, `/chat` 217, `/settings` 356,
`/knowledge` 359, `/` 519. `perf-check --prod` green with biggest chunk 272KB
and total client JS 1.8MB.

Two things worth carrying forward. **Adding queries to an existing
`Promise.all` is free**: `/connectors` and `/routines` each gained two and
stayed the two fastest pages. And **the home route is the slowest full stream
by a wide margin**, untouched for months; that is where to look next, not at
the pages someone just edited.

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
