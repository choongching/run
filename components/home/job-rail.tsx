'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderTree,
  Mail,
  PenLine,
  Search,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

// The jobs offered under the home composer, as one row you can push sideways.
//
// It used to be a wrapping block of chips, which meant the count was decided by
// how wide the row was rather than by how many jobs are worth offering: five
// wrapped into three ragged lines, so we cut to three, so the screen offered a
// narrow view of what an agent can be. A rail breaks that tie. It is one line
// at any count, and on a phone it replaces six stacked 44px rows with one.
//
// The pill is deliberately quieter than the box above it. Dropping the outline
// is what does that, not the smaller text: a bordered pill and a bordered
// composer carry the same weight whatever their size, so the composer now owns
// the only border on the screen and the rail reads as a shelf beneath it.
type Job = { label: string; prompt: string; icon: LucideIcon }

// Every one has to be a job lib/tools/definitions.ts can actually finish,
// because picking one makes it the agent's first task. The label is short so
// the row stays scannable; the prompt is the whole sentence, because that is
// what the agent is being asked to do.
const JOBS: Job[] = [
  {
    label: 'What needs a reply',
    prompt: 'Tell me what needs a reply today',
    icon: Mail,
  },
  {
    label: 'Draft my replies',
    prompt: 'Draft replies to the emails waiting on me',
    icon: PenLine,
  },
  {
    label: 'Read a document',
    prompt: 'Read a long document and tell me what matters',
    icon: FileText,
  },
  {
    label: 'Answer from my docs',
    prompt: 'Answer questions from the documents in my Drive',
    icon: FileText,
  },
  {
    label: 'Watch a topic',
    prompt: 'Watch a topic each week and write me the short version',
    icon: Search,
  },
  {
    label: 'Tidy my Drive',
    prompt: 'Tidy my Drive into folders that make sense',
    icon: FolderTree,
  },
]

// How far an arrow moves the rail, and how far a pointer may travel before a
// drag stops counting as a click on the pill underneath it.
const NUDGE = 240
const DRAG_SLOP = 4
// The fade is this wide, and a side counts as "at the end" within this many
// pixels: sub-pixel scroll positions never land exactly on 0 or on the max.
const FADE = 30
const EDGE = 4

export function JobRail({
  onPick,
  disabled = false,
}: {
  onPick: (prompt: string) => void
  disabled?: boolean
}) {
  const rail = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ left: false, right: false })
  const [overflows, setOverflows] = useState(false)
  // Set while a drag is in flight and read by the pill's click handler, so
  // pushing the rail past a pill never counts as choosing it.
  const dragged = useRef(false)

  const measure = useCallback(() => {
    const el = rail.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setOverflows(max > EDGE)
    setMore({
      left: el.scrollLeft > EDGE,
      right: max > EDGE && el.scrollLeft < max - EDGE,
    })
  }, [])

  useEffect(() => {
    measure()
    const el = rail.current
    if (!el) return
    // The row reflows with the window, and whether it overflows is the whole
    // basis of the fade, so it has to be remeasured rather than assumed.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  function nudge(by: number) {
    rail.current?.scrollBy({ left: by, behavior: smoothly() })
  }

  return (
    <div className="group/rail relative mt-5 w-full">
      <div
        ref={rail}
        onScroll={measure}
        onWheel={(e) => {
          // A wheel over a horizontal row should move it sideways. Without
          // this the rail feels dead to anyone without a trackpad.
          if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
          const el = rail.current
          if (!el) return
          el.scrollLeft += e.deltaY
        }}
        onPointerDown={(e) => {
          const el = rail.current
          if (!el || e.pointerType === 'touch') return
          dragged.current = false
          const startX = e.clientX
          const startLeft = el.scrollLeft
          const move = (ev: PointerEvent) => {
            const travelled = ev.clientX - startX
            if (Math.abs(travelled) > DRAG_SLOP) dragged.current = true
            el.scrollLeft = startLeft - travelled
          }
          const up = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
          }
          window.addEventListener('pointermove', move)
          window.addEventListener('pointerup', up)
        }}
        // Only ever fade a side that has something behind it. A permanent fade
        // on both edges is decoration claiming there is more, which is a worse
        // lie than a hard cut.
        style={{
          maskImage: fade(more),
          WebkitMaskImage: fade(more),
        }}
        className={cn(
          'no-scrollbar flex gap-2 overflow-x-auto px-0.5 py-0.5',
          overflows ? 'justify-start' : 'justify-center'
        )}
      >
        {JOBS.map(({ label, prompt, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (dragged.current) return
              onPick(prompt)
            }}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-transparent bg-muted px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 md:min-h-0"
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Hover-only, and a phone-only omission on purpose: a phone swipes the
          rail, which is the better gesture anyway. Focus reaches every pill
          through the tab order with or without these. */}
      {more.left && (
        <RailArrow side="left" onClick={() => nudge(-NUDGE)} disabled={disabled} />
      )}
      {more.right && (
        <RailArrow side="right" onClick={() => nudge(NUDGE)} disabled={disabled} />
      )}
    </div>
  )
}

function RailArrow({
  side,
  onClick,
  disabled,
}: {
  side: 'left' | 'right'
  onClick: () => void
  disabled: boolean
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Show earlier jobs' : 'Show more jobs'}
      className={cn(
        'absolute top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground opacity-0 shadow-sm transition-opacity hover:bg-muted focus-visible:opacity-100 group-hover/rail:opacity-100 md:flex',
        side === 'left' ? '-left-3' : '-right-3'
      )}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

function fade({ left, right }: { left: boolean; right: boolean }) {
  const l = left ? `${FADE}px` : '0px'
  const r = right ? `${FADE}px` : '0px'
  return `linear-gradient(to right, transparent 0px, #000 ${l}, #000 calc(100% - ${r}), transparent 100%)`
}

// Smooth unless the person asked for less motion, in which case jump.
function smoothly(): ScrollBehavior {
  if (typeof window === 'undefined') return 'auto'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}
