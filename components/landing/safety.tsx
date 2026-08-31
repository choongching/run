'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'

import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { ApprovalCard, MiniButton } from '@/components/landing/story-cards'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
import { FRAMES, PIECE_SIZES, PIN_PX, type Frame } from '@/lib/landing/collage-frames'
import { prefersReducedMotion } from '@/lib/landing/motion'

function Step({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Check className="size-3.5 shrink-0" strokeWidth={2} />
      {children}
    </span>
  )
}

// Where the reference page counts up to a number, Run has a rule. The
// section replays the reference's collage exactly: six pieces, three
// photographs and three cards, driven frame by frame from a table sampled
// off the live reference (lib/landing/collage-frames.ts) over one scrubbed
// ScrollTrigger that runs from the moment the section's top reaches the
// bottom of the viewport to the end of a 1960px pin. During the approach the
// pieces grow from nothing and spread; during the pin they grow to full size
// and draw into the collage; at 73 to 86% the rule fades out and its
// consequence fades in from 86 to 100%. Nothing here is an easing guess: the
// spike (docs/lassie-infographic-spike-2026-08-31.md) found that x and y
// follow different curves per piece, so the samples are interpolated
// instead. No counter: there is no number worth animating yet, and an
// invented one would be the first lie on the page.
//
// Positions are section-relative px at 1440 by 900, scaled by the viewport.
// Under reduced motion, and below the tablet width, nothing runs: the CSS
// puts each piece at its final centre (--x, --y) on desktop, and below 1024
// the cards stack in a column and the photographs step out.

const PIECES = ['photoTL', 'stepsTL', 'photoTR', 'routineBL', 'photoBR', 'driveBR'] as const

// Linear interpolation between the two frames around u.
function frameAt(u: number): Frame {
  let lo = 0
  let hi = FRAMES.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (FRAMES[mid].u <= u) lo = mid
    else hi = mid
  }
  const A = FRAMES[lo]
  const B = FRAMES[hi]
  const t = B.u === A.u ? 0 : Math.min(1, Math.max(0, (u - A.u) / (B.u - A.u)))
  const mix = (x: number, y: number) => x + (y - x) * t
  return {
    u,
    p: A.p.map((pa, i) => [mix(pa[0], B.p[i][0]), mix(pa[1], B.p[i][1]), mix(pa[2], B.p[i][2])]),
    a: mix(A.a, B.a),
    b: mix(A.b, B.b),
    n: mix(A.n, B.n),
  }
}

const finalOf = (i: number) => {
  const [x, y] = FRAMES[FRAMES.length - 1].p[i]
  return { '--x': x, '--y': y, '--w': PIECE_SIZES[i][0], '--h': PIECE_SIZES[i][1] } as React.CSSProperties
}

export function Safety() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const section = ref.current!
        const items = PIECES.map((id) => section.querySelector<HTMLElement>(`[data-piece="${id}"]`)!)
        const ruleA = section.querySelector<HTMLElement>('.ld-rule-a')!
        const ruleB = section.querySelector<HTMLElement>('.ld-rule-b')!
        const lead = section.querySelector<HTMLElement>('.ld-lead')!
        const scale = () => ({ kx: window.innerWidth / 1440, ky: window.innerHeight / 900 })

        const apply = (u: number) => {
          const f = frameAt(u)
          const { kx, ky } = scale()
          f.p.forEach(([cx, cy, sc], i) => {
            gsap.set(items[i], { xPercent: -50, yPercent: -50, x: cx * kx, y: cy * ky, scale: sc })
          })
          gsap.set(ruleA, { opacity: f.a })
          gsap.set(ruleB, { opacity: f.b })
          gsap.set(lead, { opacity: f.n })
        }
        apply(0)

        // The pin: section top at viewport top, for the reference's 1960px
        // scaled to this viewport.
        const pin = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: () => `+=${PIN_PX * scale().ky}`,
          pin: true,
          anticipatePin: 1,
        })
        // The replay: one proxy value scrubbed from the approach to the pin's
        // end, with the reference's smoothing, applied through the table.
        const proxy = { u: 0 }
        gsap.to(proxy, {
          u: 1,
          ease: 'none',
          onUpdate: () => apply(proxy.u),
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: () => pin.end,
            scrub: 0.25,
            invalidateOnRefresh: true,
          },
        })
      })
    },
    { scope: ref }
  )

  const piece = 'ld-piece max-lg:w-full lg:absolute lg:left-1/2 lg:top-1/2'
  const card = `${piece} ld-card`
  const photo = `${piece} ld-piece-photo relative overflow-hidden rounded-3xl max-lg:hidden`

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
            It reads.
            <br />
            You decide.
          </h2>
          <h2 className="ld-rule-b ld-heading whitespace-nowrap opacity-0 max-lg:hidden" aria-hidden>
            You say no.
            <br />
            It stops.
          </h2>
        </div>
        <p className="ld-lead max-w-[560px] text-muted-foreground">
          It can read your mail and your files any time. It cannot send, move, or delete a thing
          without you.
        </p>
      </div>

      {/* The layer the pieces live in: the section's own box on desktop, a
          column below it. */}
      <div className="contents max-lg:flex max-lg:w-full max-lg:max-w-[480px] max-lg:flex-col max-lg:gap-3 lg:pointer-events-none">
        <div data-piece="photoTL" className={photo} style={finalOf(0)}>
          <Image src="/landing/deck-1.webp" alt="" fill sizes="300px" className="object-cover" />
        </div>
        <div data-piece="stepsTL" className={`${card} flex flex-col gap-2 p-4`} style={finalOf(1)}>
          <Step>Searched your inbox, last 2 days</Step>
          <Step>Read 3 emails</Step>
          <Step>Searched the web for &quot;Northwind pricing&quot;</Step>
        </div>
        <div data-piece="photoTR" className={photo} style={finalOf(2)}>
          <Image src="/landing/deck-2.webp" alt="" fill sizes="300px" className="object-cover" />
        </div>
        <div data-piece="routineBL" className={`${card} flex flex-col gap-2.5 p-4`} style={finalOf(3)}>
          <span className="text-sm font-medium">Run this every weekday at 08:00?</span>
          <span className="font-mono text-xs text-muted-foreground xl:whitespace-nowrap">Next: Mon 31 Aug · Tue 1 Sep · Wed 2 Sep</span>
          <div className="flex gap-2">
            <MiniButton size="sm">Edit</MiniButton>
            <MiniButton size="sm" primary>Confirm</MiniButton>
          </div>
        </div>
        <div data-piece="photoBR" className={photo} style={finalOf(4)}>
          <Image src="/landing/deck-3.webp" alt="" fill sizes="300px" className="object-cover" />
        </div>
        <div data-piece="driveBR" className={piece} style={finalOf(5)}>
          <ApprovalCard
            title="Move a file in Drive"
            icon={<GoogleDriveIcon className="size-3.5" />}
            rows={[
              ['File', 'Q2 board deck.pdf'],
              ['To', 'Board / 2026'],
            ]}
          />
        </div>
      </div>
    </section>
  )
}
