---
name: perf-audit
description: Audit or improve page load, navigation, or perceived speed in the Run app. Use when anything "feels slow", before quoting any timing, or when adding data fetching to a layout or page.
---

# Speed audits for Run

Two passes (2026-07-28 and 07-30) took first paint from most of a second to
about 30ms. Every rule here was paid for with a measurement.

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
