'use client'

import { gsap, ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'

// The page's arrival, section by section, in two registers.
//
// data-depth is how a chapter opens: the block comes up out of the distance,
// at 80% and clear while it is still low on the screen, full size and full
// ink by the time it is centred. It is scrubbed by the scroll, so it is as
// slow as the hand on the wheel and comes back the same way. Scale and
// opacity only. The intro, and every section heading below it, use this.
//
// data-reveal is how contents settle: a little low and clear, rising into
// place once, the first time it comes into view, siblings staggered through
// --reveal-delay. Cards, rows and lists use this, so the page does not zoom
// at every turn.
//
// What neither does: wrap a pinned section. A transform on an ancestor
// breaks position: fixed, which is what a pin is, so the deck and the safety
// section keep their own timelines. Under reduced motion nothing here runs
// and landing.css shows everything in place.
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
    document.querySelectorAll<HTMLElement>('[data-depth]').forEach((el) => {
      gsap.fromTo(
        el,
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            end: 'center 55%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      )
    })
  }, [])
  return null
}
