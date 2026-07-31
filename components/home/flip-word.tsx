'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

// One word in the headline that cycles, blurring and lifting into place.
//
// Written here rather than pulled in from a motion library: this is the only
// animated text in the product, and a dependency of that size to move four
// words is a poor trade. The effect is three CSS properties.
//
// Every word is rendered into the same grid cell, with the inactive ones kept
// in the layout but invisible. That makes the span as wide as the longest word
// at all times, so the line never changes width. Without it the headline is
// centred, so a wider word would push every word before it sideways, which is
// the exact twitch this is meant to avoid.
//
// Assistive technology gets the sentence once, as a fixed string, from the
// caller. Everything here is decoration on top of that, so a screen reader is
// never asked to follow a word that changes on its own.
export function FlipWord({
  words,
  intervalMs = 4800,
}: {
  words: readonly string[]
  intervalMs?: number
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    // Holding still is the honest reading of "reduce motion" here: swapping the
    // word without the animation would be more jarring, not less.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (still.matches) return
    const id = setInterval(
      () => setIndex((n) => (n + 1) % words.length),
      intervalMs
    )
    return () => clearInterval(id)
  }, [words.length, intervalMs])

  return (
    <span aria-hidden className="relative inline-grid text-left align-bottom">
      {words.map((word, i) => (
        <span
          // The active key changes every cycle, which remounts that word and
          // replays its animation from the start.
          //
          // Below md the inactive words leave the width calculation
          // (absolute), so the line centres on the word actually showing:
          // the longest-word ghost width that keeps desktop reflow-free
          // visibly pushed short words leftward on a phone. The line
          // re-centres at each flip there, which reads as the word swapping
          // in place.
          key={i === index ? `on-${index}` : `off-${i}`}
          className={cn(
            'col-start-1 row-start-1',
            i === index ? 'run-flip' : 'invisible max-md:absolute'
          )}
        >
          {word}
        </span>
      ))}
    </span>
  )
}
