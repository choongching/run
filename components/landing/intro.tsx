'use client'

import { useRef } from 'react'
import Image from 'next/image'

import { gsap, useGSAP } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'

// The line after the hero. It comes up out of the distance: at 80% and
// clear while it is still low on the screen, full size and full ink by the
// time it is centred, scrubbed by the scroll so it is as slow as the hand
// on the wheel and comes back the same way. Scale and opacity only.
export function Intro() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '.ld-intro-words',
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 90%',
            end: 'center 55%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      )
    },
    { scope: ref }
  )

  return (
    <section
      ref={ref}
      aria-label="An agent, not a chatbot"
      className="flex flex-col items-center px-5 pb-16 pt-20 text-center md:pb-28 md:pt-36"
    >
      <div className="ld-intro-words flex flex-col items-center gap-6 md:gap-7">
        <Image src="/run-icon.png" alt="" width={64} height={64} className="size-12 rounded-lg md:size-16" />
        <h2 className="ld-heading max-w-[900px]">An agent, not a chatbot.</h2>
        <p className="ld-lead max-w-[620px] text-muted-foreground">
          A chatbot waits for your next prompt. An agent works toward a goal. Think of a chatbot as a
          calculator and an agent as a colleague: you provide the intent, it provides the labor.
        </p>
      </div>
    </section>
  )
}
