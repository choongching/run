'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, FileText, Globe, Mail, Send } from 'lucide-react'

import { LandingComposer } from '@/components/landing/landing-composer'
import { ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
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
    // A frosted status chip, the shape of a live activity toast: a green
    // dot that says something is happening, the icon of the thing doing it,
    // and the line sliding up into place.
    <div
      aria-live="polite"
      className="flex h-10 items-center gap-2.5 overflow-hidden rounded-full border border-white/15 bg-white/12 pl-3.5 pr-4 text-[15px] text-white/90 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md"
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-[#7fd1a0] shadow-[0_0_0_3px_rgba(127,209,160,0.25)]" />
      {/* key replays the slide on each line: the new one rises into place. */}
      <span key={index} className="ld-ticker-line flex items-center gap-2 whitespace-nowrap">
        <Icon className="size-4 shrink-0 text-white/70" strokeWidth={1.75} />
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
        <Image
          src="/home-backdrop-2200.webp"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover opacity-90"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,24,20,0.28)_0%,rgba(20,24,20,0.1)_45%,rgba(20,24,20,0.55)_100%)]"
        />
      </div>
      <div className="relative z-1 flex flex-col items-center gap-8 px-5 text-center text-white md:gap-10 md:-translate-y-8">
        {/* Two short lines, the second the turn, in italic. */}
        <h1 className="ld-display [--rise-delay:0ms] run-rise">
          Say what you need.
          <br />
          <em>Run does the rest.</em>
        </h1>
        <div className="flex flex-col items-center gap-3.5 [--rise-delay:90ms] run-rise">
          <p className="text-[17px] font-medium text-white">Let Run do the busywork.</p>
          <Ticker />
        </div>
      </div>
      <div className="ld-hero-form absolute inset-x-4 bottom-8 z-1 flex justify-center md:bottom-12">
        <LandingComposer />
      </div>
    </section>
  )
}
