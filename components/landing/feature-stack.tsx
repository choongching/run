'use client'

import { useRef } from 'react'

import { DriveStory, GmailStory, RoutineStory } from '@/components/landing/story-cards'
import { gsap, useGSAP } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'

const FEATURES = [
  {
    eyebrow: '01 · Gmail',
    title: 'It drafts. You send.',
    body: 'A reply lands in your Gmail drafts folder with the real subject and body shown first. There is no send in its toolbox, only yours.',
    side: 'left',
    Card: GmailStory,
  },
  {
    eyebrow: '02 · Google Drive',
    title: 'It answers from your files, and says where from.',
    body: 'Every reply carries the documents and pages it actually read, so you can check it rather than trust it.',
    side: 'right',
    Card: DriveStory,
  },
  {
    eyebrow: '03 · Routines',
    title: 'It does not have to wait for you.',
    body: 'Say weekday mornings and the briefing is waiting when you open the app, or on your phone. A run with nobody watching cannot write at all.',
    side: 'left',
    Card: RoutineStory,
  },
] as const

// How far back each card behind the front one sits: smaller and higher, so
// the deck reads as a deck.
const BACK = [
  { scale: 1, y: 0 },
  { scale: 0.88, y: -50 },
  { scale: 0.73, y: -110 },
]

// Three cards stacked like a deck. The section pins while you scroll, and
// the scroll itself peels the front card up and off while the next one
// scales into its place; its description fades with it. Nothing here moves
// unless the person is scrolling, and it never runs on its own.
//
// Under reduced motion the JS creates nothing and landing.css lays the
// three cards out one under the other, each with its description.
export function FeatureStack() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const cards = gsap.utils.toArray<HTMLElement>('.ld-deck-card', ref.current)
      const descs = gsap.utils.toArray<HTMLElement>('.ld-deck-desc', ref.current)

      const mm = gsap.matchMedia()
      // How long the pin lasts, in viewport heights, per width. A phone gets
      // longer because the swipe is shorter than a wheel scroll.
      const build = (heights: number) => {
        const vh = window.innerHeight
        cards.forEach((card, i) => {
          const b = BACK[Math.min(i, BACK.length - 1)]
          gsap.set(card, { scale: b.scale, y: b.y, transformOrigin: 'center top', zIndex: cards.length - i })
        })
        gsap.set(descs[0], { opacity: 1 })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ref.current,
            start: 'center center',
            end: `+=${vh * heights}`,
            pin: true,
            scrub: 0.25,
            anticipatePin: 1,
          },
        })

        for (let i = 0; i < cards.length - 1; i++) {
          // A moment of rest with the card fully in view, then the peel: the
          // front card leaves by a full viewport, the next one grows into
          // place, the one behind that steps up one rank.
          tl.to({}, { duration: 0.6 })
          tl.to(descs[i], { opacity: 0, duration: 0.3 }, '<')
          tl.to(cards[i], { y: -vh, duration: 1, ease: 'none' }, '>')
          tl.to(cards[i + 1], { scale: 1, y: 0, duration: 1, ease: 'none' }, '<')
          if (cards[i + 2]) tl.to(cards[i + 2], { scale: BACK[1].scale, y: BACK[1].y, duration: 1, ease: 'none' }, '<')
          tl.to(descs[i + 1], { opacity: 1, duration: 0.3 }, '<0.5')
        }
        // The last card never leaves; the pin releases with it in view.
        tl.to({}, { duration: 0.6 })
      }

      mm.add('(min-width: 1280px)', () => build(2.2))
      mm.add('(min-width: 1024px) and (max-width: 1279px)', () => build(3))
      mm.add('(max-width: 1023px)', () => build(2.5))
    },
    { scope: ref }
  )

  return (
    <section ref={ref} id="how" aria-label="What an agent does" className="relative px-4 py-8 md:px-8 md:py-24">
      {/* Below the tablet width the descriptions stack above the deck in a
          fixed-height slot so the fade never moves the card. */}
      <div className="ld-deck relative mx-auto flex h-[720px] max-w-[1376px] flex-col items-center justify-end max-lg:h-auto max-lg:gap-6">
        <div className="relative w-full max-w-[480px] lg:contents max-lg:min-h-[150px]">
          {FEATURES.map((f) => (
            <div
              key={f.eyebrow}
              data-side={f.side}
              className="ld-deck-desc flex flex-col gap-3 max-lg:inset-x-0 max-lg:top-0 lg:bottom-[120px]"
            >
              <span className="ld-eyebrow">{f.eyebrow}</span>
              <h3 className="ld-subheading">{f.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
        {/* On a phone the slot is sized from the viewport so the whole card
            is on screen while the section is pinned: the pin is only worth
            having if the thing it holds still can be seen. */}
        <div className="relative w-full max-w-[823px] max-lg:h-[clamp(400px,calc(100svh-320px),560px)] lg:h-[470px]">
          {FEATURES.map((f) => (
            <f.Card key={f.eyebrow} className="ld-deck-card absolute inset-x-0 top-0 h-full overflow-hidden" />
          ))}
        </div>
      </div>
    </section>
  )
}
