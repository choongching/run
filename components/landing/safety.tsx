'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'

import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { ApprovalCard, MiniButton } from '@/components/landing/story-cards'
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

// Where the reference page counts up to a number, Run has a rule. The
// section pins for 2.2 viewport heights and six pieces, three photographs
// and three cards, sit around the rule from the first frame: small (0.53)
// and spread wide and flat, then growing to full size over the first 45% of
// the pin and drawing in, eased, into a collage for the whole of it. Part
// way through, the rule gives way to its consequence. Nothing flies in from
// off screen and nothing rotates; the measurements behind every number here
// are in docs/lassie-infographic-spike-2026-08-31.md. No counter: there is
// no number worth animating yet, and an invented one would be the first
// lie on the page.
//
// Resting positions are CSS (percentages of the section, from the measured
// collage at 1440 by 900); GSAP only ever adds an offset and a scale, so
// reduced motion, which clears the transforms, shows the finished collage.
// Below the tablet width the six pieces sit in a column under the text and
// nothing pins.

// Each piece's centre relative to the section's centre at 1440 by 900, and
// its box, from which the CSS left and top are derived.
type Piece = { fx: number; fy: number; w: number; h: number }
const at1440 = ({ fx, fy, w, h }: Piece) =>
  ({
    left: `${(((720 + fx - w / 2) / 1440) * 100).toFixed(2)}%`,
    top: `${(((450 + fy - h / 2) / 900) * 100).toFixed(2)}%`,
    '--w': `${w}px`,
  }) as React.CSSProperties
const PIECES = {
  photoTL: { fx: -548, fy: -310, w: 236, h: 261 },
  stepsTL: { fx: -500, fy: -180, w: 300, h: 110 },
  photoTR: { fx: 400, fy: -300, w: 273, h: 277 },
  routineBL: { fx: -550, fy: 160, w: 340, h: 120 },
  photoBR: { fx: 269, fy: 174, w: 238, h: 228 },
  driveBR: { fx: 380, fy: 160, w: 320, h: 120 },
} satisfies Record<string, Piece>

export function Safety() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const section = ref.current!
        const items = gsap.utils.toArray<HTMLElement>('.ld-fly', section)
        const vh = window.innerHeight
        const heights = window.innerWidth >= 1280 ? 2.2 : 1.2
        const k = Math.min(1, window.innerWidth / 1440)

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'center center',
            end: `+=${vh * heights}`,
            pin: true,
            scrub: 0.25,
            anticipatePin: 1,
          },
        })
        // The spread: wider than the collage and flatter. The reference
        // measures x 1.34 and y 0.22 times the resting offset; ours is 1.2
        // wide so the left-hand pieces start inside the frame.
        items.forEach((el) => {
          const p = PIECES[el.dataset.piece as keyof typeof PIECES]
          tl.fromTo(el, { scale: 0.53 }, { scale: 1, duration: 0.45 }, 0)
          tl.fromTo(el, { x: p.fx * 0.2 * k, y: -p.fy * 0.78 * k }, { x: 0, y: 0, duration: 1, ease: 'power2.out' }, 0)
        })
        // The rule steps out at 70 to 80%, its consequence in at 80 to 100%.
        tl.to('.ld-rule-a', { opacity: 0, duration: 0.1 }, 0.7)
        tl.fromTo('.ld-rule-b', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.8)
      })
    },
    { scope: ref }
  )

  const card = 'ld-fly ld-card lg:absolute lg:w-(--w)'
  // Below the tablet width the photographs step out: three of them at full
  // width would be twelve hundred pixels of decoration in the column.
  const photo = 'ld-fly relative overflow-hidden rounded-3xl max-lg:hidden lg:absolute lg:w-(--w)'

  return (
    <section
      ref={ref}
      id="safety"
      aria-label="Safety"
      className="relative flex flex-col items-center justify-center gap-10 px-4 py-16 md:px-8 lg:h-svh lg:gap-0 lg:py-0"
    >
      <div data-reveal className="relative z-2 flex max-w-[720px] flex-col items-center gap-5 text-center">
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

      <div className="contents max-lg:flex max-lg:w-full max-lg:max-w-[480px] max-lg:flex-col max-lg:gap-3">
        <div data-piece="photoTL" className={`${photo} aspect-[236/261] w-full`} style={at1440(PIECES.photoTL)}>
          <Image src="/landing/deck-1.webp" alt="" fill sizes="300px" className="object-cover" />
        </div>
        <div data-piece="stepsTL" className={`${card} z-1 flex w-full flex-col gap-2 p-4`} style={at1440(PIECES.stepsTL)}>
          <Step>Searched your inbox, last 2 days</Step>
          <Step>Read 3 emails</Step>
          <Step>Searched the web for &quot;Northwind pricing&quot;</Step>
        </div>
        <div data-piece="photoTR" className={`${photo} aspect-[273/277] w-full`} style={at1440(PIECES.photoTR)}>
          <Image src="/landing/deck-2.webp" alt="" fill sizes="300px" className="object-cover" />
        </div>
        <div data-piece="routineBL" className={`${card} flex w-full flex-col gap-2.5 p-4`} style={at1440(PIECES.routineBL)}>
          <span className="text-sm font-medium">Run this every weekday at 08:00?</span>
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">Next: Mon 31 Aug · Tue 1 Sep · Wed 2 Sep</span>
          <div className="flex gap-2">
            <MiniButton size="sm">Edit</MiniButton>
            <MiniButton size="sm" primary>Confirm</MiniButton>
          </div>
        </div>
        <div data-piece="photoBR" className={`${photo} aspect-[238/228] w-full`} style={at1440(PIECES.photoBR)}>
          <Image src="/landing/deck-3.webp" alt="" fill sizes="300px" className="object-cover" />
        </div>
        <div data-piece="driveBR" className="ld-fly z-1 w-full lg:absolute lg:w-(--w)" style={at1440(PIECES.driveBR)}>
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
