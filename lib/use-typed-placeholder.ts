'use client'

import { useEffect, useRef, useState } from 'react'

// The home composer's placeholder types out a few real examples, then stops
// for good and rests on the static tip.
//
// It types into the REAL placeholder attribute rather than an overlaid
// element, which is the whole reason this is thirty lines and not a component.
// The browser keeps doing what it already does: the moment the field has a
// value, the placeholder is gone, with no hide-on-typing to re-implement and
// no second set of type metrics to keep in step with the first. The cost is
// that there can be no blinking caret, which is a fair price.
//
// Four things here are not polish, they are the conditions this was allowed
// on (see docs/typing-placeholder-spike-2026-08-26.md):
//
//   1. IT STOPS FOR GOOD. WCAG 2.2.2 asks for a way to pause anything that
//      starts on its own, runs past five seconds and sits beside other
//      content. A loop is all three. Rather than put a pause button on the
//      hero, it runs once through the examples and rests. Nothing to pause.
//
//   2. IT NEVER STARTS UNDER REDUCED MOTION. Checked once, on mount.
//
//   3. IT STOPS THE INSTANT SOMEONE IS IN THE BOX. Focus or a single typed
//      character ends it, so the tip is what a person actually about to type
//      is reading. The caller owns that, through `active`.
//
//   4. IT STOPS ON A HIDDEN TAB. Chrome throttles timers in a hidden tab to
//      roughly once a minute, which would drip characters out one a minute
//      and leave a half-typed fragment sitting there when someone came back.
//      Same lesson as lib/use-connect-poll.ts, opposite conclusion: that one
//      rechecks on return, this one restarts the line it was in the middle of.
//
// Returns the string to hand the placeholder attribute. Give the field its own
// static aria-label: with no visible label the placeholder IS the field's
// accessible name, and a name that changes twenty times a second is not one.
const TYPE_MS = 38
const HOLD_MS = 1900
const GAP_MS = 300
const FIRST_MS = 1100

export function useTypedPlaceholder(opts: {
  // What to type, in order. Each one runs once and then it is over.
  examples: string[]
  // Shown before it starts, between it and the end, and forever after.
  resting: string
  // Whether it may run at all: the box empty, unfocused, and in a state
  // where the placeholder is this line rather than something more urgent.
  active: boolean
}): string {
  const { examples, resting, active } = opts
  const [typed, setTyped] = useState('')
  // Progress lives in refs, not state: it has to survive the pauses (a focus,
  // a hidden tab) without restarting from the top, and nothing renders from it.
  const index = useRef(0)
  const done = useRef(false)

  useEffect(() => {
    if (!active || done.current || examples.length === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      done.current = true
      return
    }

    // Everything below belongs to THIS run of the effect, timer included, and
    // every step checks whether it is still the live one. Both matter: React
    // mounts effects twice in development, and two chains sharing one timer
    // handle interleave. The version that shared a timer ref and never
    // re-checked its flag left the last example on screen forever, because the
    // losing chain went on typing after the winner had already finished and
    // put the tip back. Caught in the browser, not in review.
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const stop = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }
    const schedule = (ms: number, run: () => void) => {
      stop()
      timer = setTimeout(() => {
        if (cancelled || done.current) return
        run()
      }, ms)
    }

    // One character, then the next, then the line after it. The setState is
    // inside a timer callback rather than the effect body on purpose: React
    // forbids the latter, and this is an animation rather than state synced
    // from props.
    const type = (text: string) => {
      const full = examples[index.current]
      if (text.length < full.length) {
        const next = full.slice(0, text.length + 1)
        setTyped(next)
        schedule(TYPE_MS, () => type(next))
        return
      }
      schedule(HOLD_MS, () => {
        index.current += 1
        setTyped('')
        if (index.current >= examples.length) {
          done.current = true
          return
        }
        schedule(GAP_MS, () => type(''))
      })
    }

    // Restart the line it was part way through rather than the whole run: the
    // characters already typed are gone from the screen either way, and
    // finishing a sentence nobody saw the start of reads as a glitch.
    const begin = (delay: number) => schedule(delay, () => type(''))

    const onVisibility = () => {
      if (document.hidden) stop()
      else if (!done.current && !cancelled) begin(GAP_MS)
    }

    begin(typed ? GAP_MS : FIRST_MS)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // `typed` is deliberately not a dependency: it changes on every character
    // and would restart the effect with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, examples])

  return active && typed ? typed : resting
}
