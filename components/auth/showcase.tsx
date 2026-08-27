'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

// The other half of the sign-in page: an agent at work, shown rather than
// described.
//
// Three scenes, each the same sentence in four parts: the agent says what it
// did, the thing it made floats below, then a pill for where and one claim.
// Every scene is something the product does today and nothing more, checked
// against the tools in lib/tools/definitions.ts: a Gmail draft that waits for
// approval, an answer from Drive with its sources, a routine's report on the
// phone. A fourth scene is a promise the code would have to keep first.
//
// Motion: runs once, then rests. Each scene arrives (line, card, pill, claim,
// about 900ms), holds for `dwellMs`, and hands over to the next. After the
// third there is nothing left to do and the page goes idle, which is the
// whole point: a sign-in tab is the one people leave open, and an animation
// that never ends keeps the compositor awake for as long as it is open (the
// home screen's drift did exactly that, and the founder's fans found it).
// WCAG 2.2.2 reads the same way: content that moves on its own for over five
// seconds needs a way to stop, or has to stop on its own. This does both.
//
// The dots are the control. Picking one cancels the auto-advance for good;
// hovering the panel holds the current scene. In `still` mode (register,
// forgot, reset) the first scene simply sits there, because those pages are
// for doing one thing.
type Scene = {
  where: string
  claim: string
  line: React.ReactNode
  card: React.ReactNode
}

const SCENES: readonly Scene[] = [
  {
    where: 'In your Gmail',
    claim: 'Drafts the reply. Sends nothing without you.',
    line: (
      <>
        I read the thread with <strong className="font-semibold">Acme</strong>{' '}
        and drafted a reply. It is in your drafts, waiting on you.
      </>
    ),
    card: (
      <div className="flex w-full max-w-[500px] flex-col gap-3.5 p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            Ac
          </span>
          <span className="text-[15px] font-semibold">Re: Invoice 1042, second reminder</span>
        </div>
        <p className="text-sm">Hi Priya,</p>
        <Skeleton widths={['92%', '100%', '64%']} />
        <div className="flex items-center gap-2 pt-1" aria-hidden>
          <span className="flex h-8 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground">
            Approve
          </span>
          <span className="flex h-8 items-center rounded-lg border border-border px-3.5 text-sm font-medium">
            Not now
          </span>
        </div>
      </div>
    ),
  },
  {
    where: 'In your Drive',
    claim: 'Answers from your documents, and shows you which.',
    line: (
      <>
        The answer is in the <strong className="font-semibold">Q2 board deck</strong>,
        page 4. Here is the short version.
      </>
    ),
    card: (
      <div className="flex w-full max-w-[500px] flex-col gap-3.5 p-5">
        <p className="text-[15px]/[22px]">
          Churn fell to 2.1% after the onboarding change. The board asked for
          the same read in Q3 before deciding on the second hire.
        </p>
        <div className="flex flex-wrap gap-2">
          <SourceChip>Q2 board deck</SourceChip>
          <SourceChip>Retention, weekly</SourceChip>
        </div>
      </div>
    ),
  },
  {
    where: 'On a schedule',
    claim: 'Runs while you sleep. Reports to your phone.',
    line: (
      <>
        Monday, 08:00. <strong className="font-semibold">Industry News Tracker</strong>{' '}
        ran while you slept and sent the short version to your phone.
      </>
    ),
    card: (
      <div className="flex w-full max-w-[380px] flex-col gap-2.5 px-4.5 py-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="size-5.5 rounded-full bg-primary" />
            Run
          </span>
          <span className="text-xs text-muted-foreground">08:00</span>
        </div>
        <p className="text-sm">
          Three things moved this week. One of them is worth a call: Northwind
          changed pricing on Friday.
        </p>
        <Skeleton widths={['70%']} />
      </div>
    ),
  },
]

function Skeleton({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {widths.map((w) => (
        <span key={w} className="block h-2.5 rounded-full bg-accent" style={{ width: w }} />
      ))}
    </div>
  )
}

function SourceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-6.5 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      {children}
    </span>
  )
}

export function Showcase({
  mode = 'play',
  dwellMs = 6000,
}: {
  mode?: 'play' | 'still'
  dwellMs?: number
}) {
  const [scene, setScene] = useState(0)
  // Once a person has picked a scene, or the run has finished, the timer
  // never starts again. A ref rather than state because nothing renders it.
  const stopped = useRef(mode === 'still')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (stopped.current || paused || scene >= SCENES.length - 1) return
    const id = setTimeout(() => setScene((n) => n + 1), dwellMs)
    return () => clearTimeout(id)
  }, [scene, paused, dwellMs])

  function pick(i: number) {
    stopped.current = true
    setScene(i)
  }

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-shell border bg-sidebar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Backdrop />
      {SCENES.map((s, i) => (
        <div
          key={s.where}
          // Every scene is in the tree so the panel's height never changes;
          // only the active one is visible and animates. Inactive scenes are
          // taken out of the accessibility tree so a reader hears one story.
          data-active={i === scene || undefined}
          aria-hidden={i !== scene}
          className="run-scene absolute inset-0 flex flex-col justify-between p-6 md:px-16 md:pt-[72px] md:pb-12"
        >
          <div className="hidden flex-col gap-6 md:flex">
            <p className="run-scene-line max-w-[520px] text-[22px]/8 text-pretty">{s.line}</p>
            <div className="run-scene-card flex w-fit rounded-[calc(var(--radius-shell)-1px)] bg-card">
              {s.card}
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 md:pr-20">
            <span className="run-scene-pill inline-flex h-6 items-center rounded-full bg-primary/12 px-2.5 text-xs font-medium tracking-wider text-primary uppercase">
              {s.where}
            </span>
            <p className="run-scene-claim max-w-[440px] text-[19px]/[26px] font-medium text-balance md:text-xl/7">
              {s.claim}
            </p>
          </div>
        </div>
      ))}
      {mode === 'play' && (
        <div
          role="tablist"
          aria-label="Scenes"
          className="absolute right-6 bottom-4 z-10 hidden items-center md:right-[58px] md:bottom-[45px] md:flex"
        >
          {SCENES.map((s, i) => (
            <button
              key={s.where}
              type="button"
              role="tab"
              aria-selected={i === scene}
              aria-label={s.where}
              onClick={() => pick(i)}
              // A 6px dot with a 24px hand around it.
              className={cn(
                'group relative h-6 w-4.5 cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                'transition-[width] duration-[220ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none',
                i === scene && 'w-8'
              )}
            >
              <span
                className={cn(
                  'absolute top-[9px] left-1.5 h-1.5 w-1.5 rounded-full bg-foreground/30',
                  'transition-[width,background-color] duration-[220ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none',
                  i === scene && 'w-5 bg-foreground'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// The home screen's wall, at the home screen's settings. Same picture, same
// veil, so the door and the room behind it are visibly the same place.
function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[calc(var(--radius-shell)-1px)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- hand-tuned sizes, see components/home/ambient-backdrop.tsx */}
      <img
        src="/home-backdrop-2200.webp"
        srcSet="/home-backdrop-1400.webp 1400w, /home-backdrop-2200.webp 2200w"
        sizes="(min-width: 768px) 50vw, 100vw"
        alt=""
        decoding="async"
        fetchPriority="low"
        className="run-backdrop absolute inset-0 size-full object-cover"
      />
      <span className="run-backdrop-veil absolute inset-0" />
    </div>
  )
}
