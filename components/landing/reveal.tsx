'use client'

import { ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'

// The page's arrival, section by section. Anything marked data-reveal
// starts a little low and clear, and rises into place once, the first time
// it comes into view; siblings stagger through --reveal-delay. The hero
// stages itself on load through run-rise; this carries the same motion
// down the rest of the page as you scroll.
//
// What it never does: wrap a pinned section. A transform on an ancestor
// breaks position: fixed, which is what a pin is, so the deck and the
// safety section reveal only their text. Under reduced motion nothing
// here runs and landing.css shows everything in place.
export function Reveal() {
  useGSAP(() => {
    if (prefersReducedMotion()) {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'))
      return
    }
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => el.classList.add('is-in'),
      })
    })
  }, [])
  return null
}
