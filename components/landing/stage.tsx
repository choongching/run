'use client'

import { useRef } from 'react'
import { Check } from 'lucide-react'

import { ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'
import { cn } from '@/lib/utils'

// The staging the small stories on the page share. Inside a stage, an
// element marked ld-t starts hidden and arrives at its own --d (seconds)
// once the stage is active; ld-t-out sends it away again at --d2; a
// Spinner turns a fixed number of times and resolves to a check. The rules
// live in landing.css under "the deck's toast stories".
//
// The deck flips data-active from its own scroll timeline. Everything else
// uses Stage, which flips it once, the first time the stage comes into
// view, and never again: the story plays through and rests. Under reduced
// motion the finished frame shows straight away.

export function at(d: number) {
  return { '--d': `${d}s` } as React.CSSProperties
}

export function Spinner({ start, spins }: { start: number; spins: number }) {
  return (
    <span className="relative flex size-6 shrink-0 items-center justify-center">
      <span
        className="ld-t-spin absolute inset-0 rounded-full border border-dashed border-muted-foreground/60"
        style={{ '--d': `${start}s`, '--n': spins } as React.CSSProperties}
      />
      <Check className="ld-t size-3.5 text-primary" strokeWidth={2} style={at(start + spins * 0.9)} />
    </span>
  )
}

export function Stage({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (prefersReducedMotion()) {
        el.setAttribute('data-active', 'true')
        return
      }
      ScrollTrigger.create({
        trigger: el,
        start: 'top 80%',
        once: true,
        onEnter: () => el.setAttribute('data-active', 'true'),
      })
    },
    { scope: ref }
  )

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  )
}
