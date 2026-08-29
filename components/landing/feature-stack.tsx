'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Check, FileText, Mail } from 'lucide-react'

import { GmailIcon } from '@/components/icons/gmail'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/landing/gsap'
import { prefersReducedMotion } from '@/lib/landing/motion'
import { cn } from '@/lib/utils'

// Three big photo cards stacked like a deck, one small piece of the product
// floating on each. Built to the reference's measurements (spec 7.2 / 7.3):
// the frame is 823 x 518 at 1440 with a 64px corner, the next card peeks
// out BELOW the front one at scale 0.85 / y 12%, the one behind that at
// 0.70 / 24%, and the text hugs the viewport edge, left, right, left.
//
// The section pins and the scroll drives one master timeline: each card
// waits behind, enters (scale to 1, text fades in, the photo settles from
// 1.05 to 1), then leaves straight up by a viewport while the next enters.
// The last card never leaves; the pin just releases.

const CARDS = [
  {
    title: 'Run does the busywork',
    body: 'Reads your inbox and your files, drafts the replies, and keeps going until the job is done.',
    side: 'left',
    photo: '/landing/deck-1.webp',
    Toast: WorkingToast,
  },
  {
    title: 'Keeps you in the loop',
    body: 'Anything that changes something stops and shows you the whole thing. Nothing goes out until you say yes.',
    side: 'right',
    photo: '/landing/deck-2.webp',
    Toast: ApprovalToast,
  },
  {
    title: 'And answers your questions',
    body: 'Ask about a document, a thread, or last week. It answers with the sources it read.',
    side: 'left',
    photo: '/landing/deck-3.webp',
    Toast: AskToast,
  },
] as const

type Part = { frame: HTMLElement; photo: HTMLElement; img: HTMLElement; desc: HTMLElement }

export function FeatureStack() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const section = ref.current!
      const frames = gsap.utils.toArray<HTMLElement>('.ld-deck-frame', section)
      const mm = gsap.matchMedia()

      mm.add(
        { desktop: '(min-width: 1280px)', tablet: '(min-width: 1024px) and (max-width: 1279px)', phone: '(max-width: 1023px)' },
        (ctx) => {
          const { desktop, tablet } = ctx.conditions as { desktop: boolean; tablet: boolean }
          const vh = window.innerHeight
          const pinHeights = desktop ? 2.2 : tablet ? 3 : 2.5

          // The DOM has the front card last so it paints on top; the story
          // runs front to back, so the parts are read in that order.
          const parts: Part[] = frames
            .slice()
            .reverse()
            .map((frame) => ({
              frame,
              photo: frame.querySelector<HTMLElement>('.ld-deck-photo')!,
              img: frame.querySelector<HTMLElement>('.ld-deck-photo img')!,
              desc: frame.querySelector<HTMLElement>('.ld-deck-desc')!,
            }))

          // The deck's resting look, before any scroll: every photo a little
          // small and low, every description hidden and low.
          parts.forEach((p, i) => {
            gsap.set(p.photo, { scale: 0.95, yPercent: 10, transformOrigin: 'center top' })
            gsap.set(p.img, { scale: 1.2 })
            gsap.set(p.desc, { opacity: 0, yPercent: 50, scale: !desktop && i > 0 ? 0.8 : 1 })
          })

          ScrollTrigger.create({
            trigger: section,
            start: 'center center',
            end: `+=${pinHeights * vh}`,
            pin: true,
            invalidateOnRefresh: true,
          })

          const master = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: desktop || tablet ? 'top center+=100' : 'top center-=100',
              end: `+=${3 * vh}`,
              scrub: 0.25,
              invalidateOnRefresh: true,
            },
          })

          // The spec plays a card's video between 50% and 80% of its
          // entrance and pauses it below 50%; ours flips a data attribute the
          // toast's CSS story keys off, so it starts once the card has
          // arrived and resets when it goes.
          const setActive = (p: Part, on: boolean) => p.frame.setAttribute('data-active', String(on))
          const enter = (p: Part) => {
            const tl = gsap.timeline({
              defaults: { ease: 'none' },
              onUpdate: () => setActive(p, tl.progress() >= 0.5),
            })
            tl.to(p.desc, { opacity: 1, duration: desktop ? 1 : 0.5 }, desktop ? 0.1 : 0)
            tl.to(p.desc, { scale: 1, yPercent: 0, duration: desktop ? 1 : 2 }, desktop ? 0.1 : 0)
            tl.to(p.photo, { scale: 1, yPercent: 0, opacity: 1, duration: 2 }, 0)
            tl.fromTo(p.img, { scale: 1.05 }, { scale: 1, duration: 2 }, 0)
            return tl
          }
          // Sitting behind `l` cards: smaller and lower for each one in front.
          const wait = (p: Part, total: number, position: number) => {
            const l = total - position
            const tl = gsap.timeline({ defaults: { ease: 'none' } })
            tl.to(p.desc, { opacity: 0, yPercent: (90 - position) * l }, 0)
            tl.to(p.photo, { scale: 1 - 0.15 * l, yPercent: (12 - position) * l, opacity: 1, duration: 2 }, 0)
            return tl
          }
          const exit = (p: Part) => {
            const tl = gsap.timeline({
              defaults: { ease: 'none' },
              onUpdate: () => { if (tl.progress() > 0.3) setActive(p, false) },
            })
            const slow = desktop ? 3 : tablet ? 2 : 3
            tl.to(p.desc, { opacity: 0, yPercent: desktop ? -60 : -100, duration: desktop ? 0.5 : slow }, 0)
            tl.to(p.photo, { scale: 1, y: -vh, duration: slow }, 0)
            return tl
          }

          const [c0, c1, c2] = parts
          master.add(gsap.timeline().add(enter(c0), 0).add(exit(c0)), 0)
          master.add(gsap.timeline().add(wait(c1, 1, 0), 0).add(enter(c1)).add(exit(c1)), 0)
          master.add(gsap.timeline().add(wait(c2, 2, 0), 0).add(wait(c2, 2, 1)).add(enter(c2)), 0)
        }
      )
    },
    { scope: ref }
  )

  return (
    <section
      ref={ref}
      id="how"
      aria-label="What an agent does"
      className="ld-deck relative mx-auto mb-[100px] h-[100vw] w-full max-w-[2050px] md:mb-[200px] md:h-[75svh] md:max-h-[700px] xl:mb-[100px] xl:h-[36vw] xl:max-h-[500px] 2xl:h-[40vw] 2xl:max-h-[750px]"
    >
      {/* Last in the DOM sits on top, so the deck reads front to back. */}
      {[...CARDS].reverse().map((card) => (
        <div
          key={card.title}
          className="ld-deck-frame absolute inset-x-0 top-[25vw] mx-auto flex w-full max-w-[500px] flex-col items-center justify-center px-4 md:top-[30px] md:h-full md:max-w-none md:py-0 xl:top-0"
        >
          <div className="relative top-0 aspect-[362/346] h-full w-full md:top-[40px] md:aspect-[975/614] md:h-[90%] md:w-auto xl:top-[20px] xl:aspect-[1100/693]">
            <article data-side={card.side} className="ld-deck-desc">
              <h3 className="ld-subheading mb-3">{card.title}</h3>
              <p className="text-[15px] leading-normal text-muted-foreground">{card.body}</p>
            </article>
            <div className="ld-deck-photo ld-surface relative h-full w-full overflow-hidden bg-[#F9F8F5]">
              <Image src={card.photo} alt="" fill sizes="(min-width: 1280px) 823px, 100vw" className="object-cover" />
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <card.Toast />
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

// ---- the three toasts: one small piece of the product on each photo ----
//
// Each one is a short story told once when its card is the active one
// (data-active on the frame): elements arrive on a delay, a spinner turns
// a fixed number of times and resolves to a check. Delays are in seconds
// on --d; nothing here loops, and the story resets when the card leaves.

// The toast is itself the first staged element: until its card is the
// active one, the photo stands alone, the way a paused video shows its
// poster.
const toast = 'ld-t w-full max-w-[600px] rounded-xl bg-white/96 p-3 shadow-[0_18px_60px_-24px_rgba(0,0,0,0.35)] backdrop-blur-sm'

function at(d: number) {
  return { '--d': `${d}s` } as React.CSSProperties
}

// A step row: a spinner that turns `spins` times from `start`, then a check.
function Spinner({ start, spins }: { start: number; spins: number }) {
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

function WorkingToast() {
  return (
    <div className={toast}>
      <div className="flex items-center gap-2 px-2 pb-3 pt-1 text-[15px]">
        <Image src="/run-icon.png" alt="" width={18} height={18} className="rounded-sm" />
        Run working…
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="ld-t flex items-center gap-2" style={at(0.2)}>
          <Spinner start={0.2} spins={2} />
          <div className="flex h-11 flex-1 items-center justify-between rounded-lg border border-border bg-card px-3 text-sm">
            <span className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" strokeWidth={1.75} />Read the thread from Acme</span>
            <span className="relative text-[13px] text-muted-foreground">
              <span className="ld-t-out" style={at(2.0)}>Reading…</span>
              <span className="ld-t absolute right-0 top-0" style={at(2.0)}>Done</span>
            </span>
          </div>
        </div>
        <div className="ld-t flex items-center gap-2" style={at(0.5)}>
          <Spinner start={2.2} spins={2} />
          <div className="flex h-11 flex-1 items-center justify-between rounded-lg border border-border bg-card px-3 text-sm">
            <span className="flex items-center gap-2"><FileText className="size-4 text-muted-foreground" strokeWidth={1.75} />Draft the reply about invoice 1042</span>
            <span className="relative text-[13px] text-muted-foreground">
              <span className="ld-t-out" style={at(2.2)}>Up next</span>
              <span className="ld-t ld-t-out absolute right-0 top-0" style={{ '--d': '2.2s', '--d2': '4.0s' } as React.CSSProperties}>Drafting…</span>
              <span className="ld-t absolute right-0 top-0" style={at(4.0)}>Done</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovalToast() {
  return (
    <div className={cn(toast, 'max-w-[420px]')}>
      <div className="ld-t overflow-hidden rounded-lg border border-ring/60 bg-card" style={at(0.2)}>
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
          <GmailIcon className="h-3 w-4" />
          Create a draft in Gmail
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border px-3 py-2.5 text-xs">
          <span className="text-muted-foreground">To</span>
          <span>Priya Nair &lt;priya@acme.com&gt;</span>
          <span className="text-muted-foreground">Subject</span>
          <span>Re: Invoice 1042, second reminder</span>
        </div>
      </div>
      <div aria-hidden className="relative flex h-11 items-center justify-end gap-2">
        <span className="ld-t ld-t-out flex h-8 items-center rounded-lg border border-border bg-card px-3 text-[13px] font-medium" style={{ '--d': '0.6s', '--d2': '2.6s' } as React.CSSProperties}>Cancel</span>
        {/* The yes: the button presses at 2.4s, then gives way to the receipt. */}
        <span className="ld-t ld-t-press ld-t-out flex h-8 items-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground" style={{ '--d': '0.6s', '--p': '2.4s', '--d2': '2.6s' } as React.CSSProperties}>Approve</span>
        <span className="ld-t absolute right-0 flex items-center gap-2 text-[13px] text-muted-foreground" style={at(2.8)}>
          <Check className="size-3.5 text-primary" strokeWidth={2} />
          Draft created in your Gmail
        </span>
      </div>
    </div>
  )
}

function AskToast() {
  return (
    <div className={cn(toast, 'max-w-[520px]')}>
      <p className="ld-t px-2 pb-3 pt-1 text-sm leading-normal" style={at(0.2)}>
        Churn fell to 2.1% after the onboarding change, page 4.
      </p>
      <div className="flex flex-wrap gap-1.5 px-2 pb-3">
        <span className="ld-t flex h-6 items-center rounded-md border border-border bg-card px-2 text-xs" style={at(0.9)}>Q2 board deck.pdf</span>
        <span className="ld-t flex h-6 items-center rounded-md border border-border bg-card px-2 text-xs" style={at(1.1)}>Retention, weekly</span>
      </div>
      <div className="ld-t flex h-11 items-center rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground" style={at(1.6)}>
        Ask Run anything
      </div>
    </div>
  )
}
