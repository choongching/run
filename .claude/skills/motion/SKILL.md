---
name: motion
description: Decide whether something in Run should move, and build it so it survives review. Use before adding any animation, transition, loop, or entrance, and whenever a founder asks for something to feel more alive.
---

# Motion in Run

Run has seventeen `run-*` utilities and, until 2026-08-26, no written rule for
any of them. That session re-derived the same three decisions from scratch
twice in one morning and put the same argument to the founder twice. This file
is that argument, written down.

Read this BEFORE writing a keyframe. Layout and container rules live in
`build-ui`; this is only about things that move.

## The three questions, in order

**1. What is the motion telling the person?** Motion that reports a fact
survives review. Motion that decorates gets cut, and it gets cut late, after
it has been built. Facts that have earned motion here: this box is waiting for
you (the composer's idle drift), this is what a good prompt looks like (the
typed placeholder), the page has settled (`run-rise`, `run-settle`), the word
is one of several (`run-flip`), you are now in this field (`run-focus-fade`,
the focus sheen).

**2. Does this surface already have motion?** One surface, one animation at a
time. The composer's border drift is gated on the placeholder finishing its
run precisely because two things animating in one control compete for a single
glance, and the person resolves it by looking at neither. When two are
genuinely wanted, sequence them; do not overlap them.

**3. Does it stop?** See the gate below. This is the question that gets
skipped, and it is the only one with a standards answer.

## The WCAG 2.2.2 gate (Level A, not a taste)

Content that moves needs a mechanism to pause it when THREE things are all
true:

- it starts automatically, without anyone asking, and
- it lasts more than five seconds, and
- it sits beside other content.

An ambient loop on a page is all three.
https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html

**Run's answer is to stop rather than to add a pause button.** A hero with a
pause control is worse than no animation. The typed placeholder runs once
through its examples and rests forever; that is what makes it conformant with
nothing to click. Prefer this shape every time.

**When the founder overrides it** (they did, twice, for the composer's idle
drift), say so once, plainly, then build it and write the mitigations in the
CSS next to the rule: what makes it defensible, and what is genuinely given
up. The comment on `.run-sheen-idle` in `globals.css` is the template. Do not
re-litigate a decision the founder has made twice; do not let it go
unrecorded either.

## Always, without being asked

- **`prefers-reduced-motion: reduce` never starts.** Every `run-*` utility
  carries a `@media (prefers-reduced-motion: reduce) { animation: none }`
  block. A JS-driven animation checks `matchMedia` on mount and returns early
  (`lib/use-typed-placeholder.ts`); a scroll uses `behavior: 'auto'` instead
  of `'smooth'`.
- **Composite-only properties.** `transform`, `opacity`, `filter`. A keyframe
  that animates width, height, top or left reflows the page every frame.
  Registered custom properties (`@property`) are the exception that makes a
  gradient angle animatable at all.
- **The timer dies with the component.** An animation driven by
  `setTimeout`/`setInterval` is owned by an effect that clears it, and each
  effect run owns ITS OWN timer variable plus a `cancelled` flag. React mounts
  effects twice in development; two chains sharing one timer ref interleave,
  and the loser goes on animating after the winner has finished. That bug
  left the placeholder resting on the wrong line, and it read as a logic error
  rather than a lifecycle one.
- **A hidden tab throttles to about one frame a minute.** Anything stepping
  through content stops on `document.hidden` and resumes on
  `visibilitychange`, or a person comes back to a half-drawn sentence.

## Recipes that have survived

- **A one-shot sweep on a deliberate action** (the composer's focus sheen):
  a conic gradient on `::after`, masked to the border, angle animated through
  a registered `@property`, one iteration. Deliberate action plus short
  duration means the gate above never applies.
- **An idle drift** (`.run-sheen-idle`): the same machinery, dimmer, six times
  slower, and given its OWN gradient rather than the sweep's. A short bright
  arc reads as a smudge when you dim it; length is what makes a slow one
  legible. Raising opacity alone was tried first and did not work.
- **Stepping through content** (the typed placeholder): erase the old line
  before typing the new one, and track "a run is underway" as state rather
  than inferring it from "is there text right now". Inferring it flashed the
  resting copy back for 300ms at every boundary, which read as a glitch
  because it was one.
- **An entrance** (`run-rise`, `run-settle`): a short travel, no blur, under a
  second, staggered by a `--rise-delay` variable in reading order. It should
  read as the page settling, not performing. Home only for `run-rise`;
  standard pages settle their cards with `run-settle`.

## Two traps that cost a session

**The mask-ring composite order.** To paint a gradient on a border you fill
the box, then punch its middle out with two mask layers and `exclude`. The
PREFIXED pair must be written FIRST:

```css
-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
-webkit-mask-composite: xor;
mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
mask-composite: exclude;
```

Each shorthand resets its own composite mode, so whichever is written last
wins. With the standard pair first, the gradient floods the whole box and
looks like a rendering bug.

**A blank screenshot is not evidence.** The Chrome tool captures blank for
several seconds after a recompile while the DOM is entirely correct. Twice in
one session that nearly became a hunt for a bug that did not exist. Read the
DOM (`h1` present, opacity, bounding rect) before concluding the page is
broken; see `verify-in-browser`.

## Proving it costs nothing

Never argue about animation cost; measure it. From the signed-in tab, sample
`requestAnimationFrame` gaps over 6 to 8 seconds and watch for long tasks:

```js
const lt = []
new PerformanceObserver((l) => l.getEntries().forEach((e) => lt.push(e.duration)))
  .observe({ entryTypes: ['longtask'] })
// then collect rAF deltas and report median, p95, and how many exceed 20ms
```

Measured 2026-08-26 with the placeholder typing (about 26 re-renders a second)
and the border drifting: 120fps, **zero** dropped frames, **zero** long tasks.
Which is why `JobRail` is deliberately NOT memoized. The obvious optimisation
was left out because the measurement said it bought nothing, and a `memo` on a
component whose parent re-renders constantly is a comment claiming a problem
that is not there.
