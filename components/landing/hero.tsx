'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, FileText, Globe, Mail, Send } from 'lucide-react'

import { HeroMedia, HeroPoster } from '@/components/landing/hero-media'
import { SignUpBar } from '@/components/landing/sign-up-bar'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'

// Real step lines from Run's chat, each with the mark of the thing that did
// it, in the order a first job tends to produce them. The ticker shows them
// one at a time under the subline. It runs ONCE through the list and rests
// on the last line: an auto-starting loop beside other content needs a pause
// control (WCAG 2.2.2), and Run's answer is to stop rather than to add one.
// Same rule as the typed placeholder.
const TICKER = [
  { icon: Mail, text: 'Searched your inbox, last 2 days' },
  { icon: Mail, text: 'Read an email' },
  { icon: FileText, text: 'Read two documents in your Drive' },
  { icon: Globe, text: 'Searched the web for "invoice terms"' },
  { icon: Check, text: 'Waiting for your approval' },
  { icon: Mail, text: 'Created a draft in your Gmail' },
  { icon: Send, text: 'Routine ran, Monday 08:00' },
]
const TICKER_MS = 2500

function Ticker() {
  const [index, setIndex] = useState(0)
  // Where the run has got to, kept outside React state so the timer can be
  // armed from plain code: arming it inside a state updater would arm it
  // twice in development, where React runs updaters twice, and the cadence
  // would compound.
  const at = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) return
    let timer = 0
    let cancelled = false
    const step = () => {
      if (cancelled) return
      // A hidden tab throttles timers to about one a minute; rather than drip
      // lines out while nobody is looking, wait for the tab to come back.
      if (document.hidden) return
      at.current = Math.min(at.current + 1, TICKER.length - 1)
      setIndex(at.current)
      if (at.current < TICKER.length - 1) timer = window.setTimeout(step, TICKER_MS)
    }
    const onVisible = () => {
      if (!document.hidden && !cancelled && at.current < TICKER.length - 1) {
        window.clearTimeout(timer)
        timer = window.setTimeout(step, TICKER_MS)
      }
    }
    timer = window.setTimeout(step, TICKER_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const Icon = TICKER[index].icon
  return (
    <div aria-live="polite" className="flex h-[30px] items-center justify-center overflow-hidden text-[17px] text-white/70">
      {/* key replays the slide on each line: the new one rises into place. */}
      <span key={index} className="ld-ticker-line flex items-center gap-2.5">
        <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
        {TICKER[index].text}
      </span>
    </div>
  )
}

// Full-screen photo (the same wall the signed-in home uses) behind one
// sentence and the box. After 100px of scroll the photo clips inward with big
// rounded corners and the box lifts a little, which is the page saying "this
// is a page, and you are on it now".
export function Hero() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // A scroll position, not a tween: the CSS transition does the moving,
      // and under reduced motion that transition is switched off, so the
      // same trigger gives an instant state change instead.
      ScrollTrigger.create({
        start: 100,
        end: 'max',
        onToggle: (self) => ref.current?.setAttribute('data-zoom', String(self.isActive)),
      })
      if (prefersReducedMotion()) return
      // The words step back as you leave: scrubbed by the scroll, so it is
      // as slow as the hand on the wheel and comes back the same way. Scale
      // and opacity only. Over the first 60% of a viewport of travel.
      gsap.to('.ld-hero-words', {
        scale: 0.86,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * 0.6}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    },
    { scope: ref }
  )

  return (
    <section
      ref={ref}
      data-landing-hero
      data-zoom="false"
      aria-label="Introduction"
      className="relative flex h-svh w-full items-center justify-center"
    >
      <div className="ld-hero-media absolute inset-0 overflow-hidden bg-foreground">
        <HeroPoster />
        <HeroMedia />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,24,20,0.28)_0%,rgba(20,24,20,0.1)_45%,rgba(20,24,20,0.55)_100%)]"
        />
      </div>
      <div className="ld-hero-words relative z-1 flex flex-col items-center gap-8 px-5 text-center text-white md:gap-10 md:-translate-y-8">
        {/* Two short lines, the second the turn, in italic. */}
        <h1 className="ld-display [--rise-delay:0ms] run-rise">
          Fewer small tasks.
          <br />
          <em>More of the day.</em>
        </h1>
        <div className="flex flex-col items-center gap-2 [--rise-delay:90ms] run-rise">
          <p className="text-[17px] text-white">Run takes the small tasks. You take the day.</p>
          <Ticker />
        </div>
      </div>
      {/* Two wrappers on purpose: the outer one lifts 50px when the hero
          zooms (a transition), the inner one rises on load (an animation).
          On one element the finished animation's fill would hold its
          transform over the transition and the lift would never happen. */}
      <div className="ld-hero-form absolute inset-x-4 bottom-4 z-1 flex justify-center">
        <div className="flex w-full justify-center [--rise-delay:270ms] run-rise">
          <SignUpBar />
        </div>
      </div>
    </section>
  )
}
