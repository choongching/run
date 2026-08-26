'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
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
// because picking one makes it the agent's first task.
//
// The label is a phrase rather than a heading, because the rail bought the
// room for it: when the chips had to fit one static row, "What needs a reply"
// was as long as they could be, and it read as a category. "Tell me what needs
// a reply" is something a person says out loud, which is the whole pitch. The
// prompt underneath is longer still, since that is what the agent acts on.
const JOBS: Job[] = [
  {
    label: 'Tell me what needs a reply',
    prompt: 'Tell me what needs a reply today',
    icon: Mail,
  },
  {
    label: 'Draft the replies waiting on me',
    prompt: 'Draft replies to the emails waiting on me',
    icon: PenLine,
  },
  {
    label: 'Read a long document for me',
    prompt: 'Read a long document and tell me what matters',
    icon: FileText,
  },
  {
    label: 'Answer questions from my docs',
    prompt: 'Answer questions from the documents in my Drive',
    icon: FileText,
  },
  {
    label: 'Watch a topic every week',
    prompt: 'Watch a topic each week and write me the short version',
    icon: Search,
  },
  {
    label: 'Tidy my Drive into folders',
    prompt: 'Tidy my Drive into folders that make sense',
    icon: FolderTree,
  },
]

// How far a pointer may travel before a drag stops counting as a click on the
// pill underneath it.
const DRAG_SLOP = 4
// The fade is this wide, and a side counts as "at the end" within this many
// pixels: sub-pixel scroll positions never land exactly on 0 or on the max.
//
// Wide on purpose. A narrow fade is a vignette you notice as an effect; a wide
// one is a pill quietly running out of ink, and only the second one reads as
// "there is more this way" without anything having to say so.
const FADE = 56
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

  return (
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
          'no-scrollbar mt-5 flex w-full gap-2 overflow-x-auto px-0.5 py-0.5',
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
  )
}

// The mask, with the falloff eased rather than linear.
//
// A two-stop gradient fades at a constant rate, which the eye reads as a grey
// band laid over the row. Two extra stops put most of the disappearing in the
// last third, so a pill stays legible until it is nearly gone and then goes
// quickly. That is the difference between a vignette and something running off
// the edge of the screen.
function fade({ left, right }: { left: boolean; right: boolean }) {
  const stops: string[] = []
  if (left) {
    stops.push(
      'transparent 0px',
      `rgb(0 0 0 / 0.12) ${Math.round(FADE * 0.35)}px`,
      `rgb(0 0 0 / 0.62) ${Math.round(FADE * 0.68)}px`,
      `#000 ${FADE}px`
    )
  } else {
    stops.push('#000 0px')
  }
  if (right) {
    stops.push(
      `#000 calc(100% - ${FADE}px)`,
      `rgb(0 0 0 / 0.62) calc(100% - ${Math.round(FADE * 0.68)}px)`,
      `rgb(0 0 0 / 0.12) calc(100% - ${Math.round(FADE * 0.35)}px)`,
      'transparent 100%'
    )
  } else {
    stops.push('#000 100%')
  }
  return `linear-gradient(to right, ${stops.join(', ')})`
}
