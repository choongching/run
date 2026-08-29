'use client'

import { useRef } from 'react'
import { Check } from 'lucide-react'

import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { ApprovalCard } from '@/components/landing/story-cards'
import { gsap, useGSAP } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'

function Step({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Check className="size-3.5 shrink-0" strokeWidth={2} />
      {children}
    </span>
  )
}

function MiniButton({ primary, children }: { primary?: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={
        primary
          ? 'flex h-7 items-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground'
          : 'flex h-7 items-center rounded-lg border border-border bg-card px-3 text-[13px] font-medium'
      }
    >
      {children}
    </span>
  )
}

// Where the reference page counts up to a number, Run has a rule. The
// section pins, six pieces of the product fly in from outside the viewport
// and settle around the rule, and part way through the pin the rule gives
// way to its consequence. No counter: there is no number worth animating
// yet, and an invented one would be the first lie on the page.
//
// Only the wide layout flies. Below the tablet width the six pieces sit in
// a column under the text and nothing pins, and under reduced motion the
// same is true at every width.
export function Safety() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const section = ref.current!
        const items = gsap.utils.toArray<HTMLElement>('.ld-fly', section)
        const vw = window.innerWidth
        const vh = window.innerHeight
        const heights = vw >= 1280 ? 2.2 : 1.2

        // Each piece starts well outside the viewport, on the far side of
        // the direction it will settle in: the same vector from the centre
        // to its resting place, stretched past the edge.
        const rect = section.getBoundingClientRect()
        const starts = items.map((el) => {
          const r = el.getBoundingClientRect()
          const dx = r.left + r.width / 2 - (rect.left + rect.width / 2)
          const dy = r.top + r.height / 2 - (rect.top + rect.height / 2)
          const len = Math.hypot(dx, dy) || 1
          return { x: (dx / len) * vw * 0.9, y: (dy / len) * vh * 0.9 }
        })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'center center',
            end: `+=${vh * heights}`,
            pin: true,
            scrub: 0.25,
            anticipatePin: 1,
          },
        })
        // The pieces arrive over the first half, a beat apart.
        items.forEach((el, i) => {
          tl.fromTo(
            el,
            { x: starts[i].x, y: starts[i].y, scale: 0.4, opacity: 0 },
            { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'none' },
            i * 0.06
          )
        })
        // At about 72% the rule steps out and its consequence steps in.
        tl.to({}, { duration: 0.1 }, 0.9)
        tl.to('.ld-rule-a', { yPercent: -40, opacity: 0, duration: 0.15, ease: 'none' }, 1.0)
        tl.fromTo('.ld-rule-b', { yPercent: 20, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.15, ease: 'none' }, 1.1)
        tl.to({}, { duration: 0.15 })
      })
    },
    { scope: ref }
  )

  const fly = 'ld-fly ld-card lg:absolute'

  return (
    <section
      ref={ref}
      id="safety"
      aria-label="Safety"
      className="relative flex flex-col items-center justify-center gap-10 px-4 py-16 md:px-8 lg:h-svh lg:gap-0 lg:py-0"
    >
      <div className="relative z-2 flex max-w-[720px] flex-col items-center gap-5 text-center">
        {/* Two headings in one slot: the second sits over the first and
            only shows once the pin has carried the rule in. */}
        <div className="grid [&>*]:[grid-area:1/1]">
          <h2 className="ld-rule-a ld-heading">
            Reads are free.
            <br />
            Writes ask first.
          </h2>
          <h2 className="ld-rule-b ld-heading whitespace-nowrap opacity-0 max-lg:hidden" aria-hidden>
            When you say no,
            <br />
            it stays no.
          </h2>
        </div>
        <p className="ld-lead max-w-[560px] text-muted-foreground">
          Searching your inbox changes nothing, so it just happens. Anything that would change
          something stops, shows you the whole thing, and waits for your yes.
        </p>
      </div>

      <div className="contents max-lg:flex max-lg:w-full max-lg:max-w-[480px] max-lg:flex-col max-lg:gap-3">
        <div className={`${fly} flex w-full flex-col gap-2 p-4 lg:left-[10%] lg:top-[16%] lg:w-[300px] lg:-rotate-4`}>
          <Step>Searched your inbox, last 2 days</Step>
          <Step>Read 3 emails</Step>
          <Step>Searched the web for &quot;Northwind pricing&quot;</Step>
        </div>
        <div className={`ld-fly w-full lg:absolute lg:right-[10%] lg:top-[14%] lg:w-[320px] lg:rotate-3`}>
          <ApprovalCard
            title="Move a file in Drive"
            icon={<GoogleDriveIcon className="size-3.5" />}
            rows={[
              ['File', 'Q2 board deck.pdf'],
              ['To', 'Board / 2026'],
            ]}
          />
        </div>
        <div className={`${fly} flex w-full flex-wrap gap-1.5 p-4 lg:left-[3%] lg:top-[56%] lg:w-[260px] lg:rotate-2`}>
          <span className="mb-1 w-full text-[13px] text-muted-foreground">Read for this answer</span>
          <span className="flex h-6 items-center rounded-md border border-border bg-card px-2 text-xs">Q2 board deck.pdf</span>
          <span className="flex h-6 items-center rounded-md border border-border bg-card px-2 text-xs">Retention, weekly</span>
          <span className="flex h-6 items-center rounded-md border border-border bg-card px-2 text-xs">northwind.com/pricing</span>
        </div>
        <div className={`${fly} flex w-full flex-col gap-2.5 p-4 lg:right-[3%] lg:top-[56%] lg:w-[300px] lg:-rotate-3`}>
          <span className="text-sm font-semibold">Run this every weekday at 08:00?</span>
          <span className="font-mono text-xs text-muted-foreground">Next: Mon 31 Aug · Tue 1 Sep · Wed 2 Sep</span>
          <div className="flex gap-2">
            <MiniButton>Edit</MiniButton>
            <MiniButton primary>Confirm</MiniButton>
          </div>
        </div>
        <div className={`${fly} flex w-full flex-col gap-2 p-3.5 lg:bottom-[10%] lg:left-[32%] lg:w-[240px] lg:-rotate-2`}>
          <span className="text-[13px] text-muted-foreground">You said no</span>
          <span className="text-sm">Nothing ran. The agent is told the decision is final.</span>
        </div>
        <div className={`${fly} flex w-full flex-col gap-2 p-3.5 lg:bottom-[11%] lg:right-[32%] lg:w-[230px] lg:rotate-3`}>
          <span className="text-[13px] text-muted-foreground">This month</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full w-[38%] bg-primary" />
          </div>
          <span className="font-mono text-xs text-muted-foreground">38 of 100 runs</span>
        </div>
      </div>
    </section>
  )
}
