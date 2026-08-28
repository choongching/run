'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Bot, ShieldQuestion } from 'lucide-react'

import { GmailIcon } from '@/components/icons/gmail'
import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { TelegramIcon } from '@/components/icons/telegram'
import { cn } from '@/lib/utils'

// The other half of the sign-in page: Run's own chat, doing one job, shown
// rather than described.
//
// One surface in the middle of the panel, the way a product is shown rather
// than a feature list: the chat a new person will be sitting in a minute
// from now. Each scene is a short story told in that surface, and every
// story is something the code does today, checked against the tools in
// lib/tools/definitions.ts: a Gmail draft that waits for approval, an answer
// from Drive with its sources, a routine's report on the phone. A fourth
// scene is a promise the code would have to keep first.
//
// Motion: the story plays once, then rests. The message arrives, the agent
// thinks for a beat (the real chat shows the same line), the reply lands,
// then the card. About 2.5 seconds, once per scene, three scenes handed over
// on a timer, and after the third the page is idle for good: a sign-in tab
// is the one people leave open, and an animation that never ends keeps the
// compositor awake for as long as it is (the home screen's drift did exactly
// that, and the founder's fans found it). The thinking spinner is the one
// thing here that spins, and it spins a fixed three turns and stops.
//
// The pills at the top are the control. Picking one cancels the auto-advance
// for good; hovering the panel holds the current scene. In `still` mode
// (register, forgot, reset) the first story plays and nothing hands over.
type Scene = {
  key: string
  where: string
  icon: React.ComponentType<{ className?: string }>
  agent: string
  ask: React.ReactNode
  thinking: string
  reply: React.ReactNode
  card: React.ReactNode
}

const SCENES: readonly Scene[] = [
  {
    key: 'gmail',
    where: 'Gmail',
    icon: GmailIcon,
    agent: 'Inbox Assistant',
    ask: 'Draft a reply to Acme. Invoice 1042 goes out Friday.',
    thinking: 'Reading the thread',
    reply: <>Priya has asked twice, so I kept it short and led with the date.</>,
    card: (
      <div className="rounded-xl border border-ring/60 bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldQuestion className="size-4 text-muted-foreground" />
          Approve this action?
        </div>
        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <p className="text-sm font-medium">Create a draft in Gmail</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            To priya@acme.com. Re: Invoice 1042, second reminder
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2" aria-hidden>
          <span className="flex h-8 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium">
            Cancel
          </span>
          <span className="flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
            Approve
          </span>
        </div>
      </div>
    ),
  },
  {
    key: 'drive',
    where: 'Google Drive',
    icon: GoogleDriveIcon,
    agent: 'Docs Q&A Agent',
    ask: 'What did the Q2 board deck say about churn?',
    thinking: 'Reading two documents',
    reply: (
      <>
        Churn fell to 2.1% after the onboarding change, page 4. The board asked
        for the same read in Q3 before deciding on the second hire.
      </>
    ),
    card: (
      <div className="flex flex-wrap gap-1.5">
        <SourceChip>Q2 board deck.pdf</SourceChip>
        <SourceChip>Retention, weekly</SourceChip>
      </div>
    ),
  },
  {
    key: 'telegram',
    where: 'Telegram',
    icon: TelegramIcon,
    agent: 'Industry News Tracker',
    ask: <Divider>Routine ran, Monday 08:00</Divider>,
    thinking: 'Reading 14 pages',
    reply: (
      <>
        Two things worth your Monday. Northwind moved its Team plan to $18 a
        seat, up from $12, and Acme’s CTO said in an interview that she leaves
        in Q4. The rest of the week was quiet. Full notes are in the thread.
      </>
    ),
    card: (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TelegramIcon className="size-4" />
        Sent to Telegram, 08:02
      </div>
    ),
  },
]

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

// The chat's citation pill, as it is in components/chat/source-chip.tsx.
function SourceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[19px] items-center gap-[5px] rounded-full bg-muted/70 pr-[9px] pl-1 font-mono text-[10px] text-muted-foreground">
      <span className="size-3.5 rounded-full bg-chart-2/70" />
      {children}
    </span>
  )
}

export function Showcase({
  mode = 'play',
  dwellMs = 7000,
}: {
  mode?: 'play' | 'still'
  dwellMs?: number
}) {
  // `shown` is the story in the card; `leaving` is the 300ms during which
  // its rows close and its words fade before the next one fills the card.
  const [shown, setShown] = useState(0)
  const [next, setNext] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  // Once a person has picked a scene, or the run has finished, the timer
  // never starts again. A ref rather than state because nothing renders it.
  const stopped = useRef(mode === 'still')

  // The hand-over: close the current story, then mount the next one.
  useEffect(() => {
    if (next === null) return
    const id = setTimeout(() => {
      setShown(next)
      setNext(null)
    }, LEAVE_MS)
    return () => clearTimeout(id)
  }, [next])

  // The dwell: once a story has played and sat for a while, move on. Never
  // wraps: after the last one there is nothing left to schedule.
  useEffect(() => {
    if (stopped.current || paused || next !== null || shown >= SCENES.length - 1) return
    const id = setTimeout(() => setNext(shown + 1), dwellMs)
    return () => clearTimeout(id)
  }, [shown, paused, next, dwellMs])

  function pick(i: number) {
    stopped.current = true
    if (i === shown || i === next) return
    setNext(i)
  }

  const current = next ?? shown
  const s = SCENES[shown]
  const leaving = next !== null

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-shell border bg-sidebar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Backdrop />

      {/* The switcher. Named, with the product's own marks, because "where"
          is the whole question a new person has, and a dot answers nothing. */}
      <div
        role="tablist"
        aria-label="What an agent can do"
        className="relative z-10 flex flex-wrap justify-center gap-2 px-5 pt-5 md:px-10 md:pt-10"
      >
        {SCENES.map((sc, i) => (
          <button
            key={sc.key}
            type="button"
            role="tab"
            aria-selected={i === current}
            onClick={() => pick(i)}
            className={cn(
              'flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium outline-none select-none',
              'run-focus-fade focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10',
              i === current
                ? 'border-border bg-card text-foreground shadow-[0_1px_2px_oklch(0_0_0/0.05)]'
                : 'border-transparent bg-card/55 text-foreground/70 hover:bg-card/80 hover:text-foreground'
            )}
          >
            <sc.icon className="size-4" />
            {sc.where}
          </button>
        ))}
      </div>

      {/* One surface, one card, kept through every switch. It is centred and
          stays centred as it grows: the flex centring re-settles every
          frame, so each row that opens pushes the top edge up as much as
          the bottom edge down. Switching a story never replaces the card,
          only what is written in it: the rows close and the words fade,
          then the next story mounts into the same box and plays. */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-5 md:px-12 md:pb-12">
        <div
          // It floats: the one surface on the page allowed a shadow,
          // because it is the one thing that is not part of the page.
          className="run-scene w-full max-w-[580px] rounded-[calc(var(--radius-shell)-1px)] border border-border/70 bg-card shadow-[0_24px_60px_-24px_oklch(0.235_0.006_95/0.28),0_2px_6px_-2px_oklch(0.235_0.006_95/0.08)]"
        >
          <div
            key={shown}
            data-leaving={leaving || undefined}
            className="run-scene-body"
            aria-live="polite"
          >
            {/* The chat header, as it is. */}
            <div className="run-scene-words flex items-center gap-2.5 border-b border-border px-5 py-3.5">
              <Bot className="size-4.5 stroke-[1.75] text-muted-foreground" />
              <span className="text-[15px] font-semibold">{s.agent}</span>
            </div>

            {/* The body grows as the story does: each row below opens from
                zero height when its beat arrives, so the surface is never
                taller than what it has said so far. */}
            <div className="flex flex-col px-5 py-5">
              {/* What was asked, or what the clock did. */}
              <div className="run-scene-ask run-scene-words flex flex-col items-end">
                {typeof s.ask === 'string' ? (
                  <div className="max-w-[85%] rounded-xl bg-muted px-3.5 py-2.5 text-sm">
                    {s.ask}
                  </div>
                ) : (
                  <div className="w-full">{s.ask}</div>
                )}
              </div>

              <div className="run-scene-row run-scene-think-row">
                <div className="min-h-0 overflow-hidden">
                  <div className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
                    <span className="run-scene-spin size-3.5 rounded-full border-[1.5px] border-muted-foreground/30 border-t-muted-foreground" />
                    {s.thinking}
                  </div>
                </div>
              </div>

              <div className="run-scene-row run-scene-reply-row">
                <div className="min-h-0 overflow-hidden">
                  <p className="run-scene-reply run-scene-words pt-4 text-[15px]/[22px] text-pretty">
                    {s.reply}
                  </p>
                </div>
              </div>

              <div className="run-scene-row run-scene-card-row">
                <div className="min-h-0 overflow-hidden">
                  <div className="run-scene-card run-scene-words pt-4">{s.card}</div>
                </div>
              </div>
            </div>

            {/* The composer, resting. */}
            <div className="run-scene-words flex items-center justify-between border-t border-border px-5 py-3">
              <span className="text-sm text-muted-foreground">Message {s.agent}</span>
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ArrowUp className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// How long a story takes to leave the card before the next one fills it.
// Matches run-scene-close in globals.css.
const LEAVE_MS = 300

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
