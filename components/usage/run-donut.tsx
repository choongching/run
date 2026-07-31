'use client'

import { useEffect, useState } from 'react'

// A small ring in the composer's corner showing how much of the month's runs
// are used, with a hover card for the numbers. The quiet twin of the sidebar
// meter: same data, where the spending actually happens.
//
// Colours follow the meter's escalation: quiet ink, then the warning hue at
// 80%, then destructive at 95%.
type Summary = {
  used: number
  limit: number
  resetsAt: string
  threadRuns: number
}

export function RunDonut({ agentId }: { agentId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/usage/summary?agentId=${agentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!cancelled && s) setSummary(s)
      })
      .catch(() => {
        // The donut is a courtesy; a failed fetch just leaves it out.
      })
    return () => {
      cancelled = true
    }
  }, [agentId])

  if (!summary) return null

  const share = summary.limit > 0 ? summary.used / summary.limit : 0
  const tone =
    share >= 0.95
      ? 'text-destructive'
      : share >= 0.8
        ? 'text-chart-4'
        : 'text-foreground/70'
  // r=6 in a 16px box; the dash pair draws the used share of the circle.
  const circumference = 2 * Math.PI * 6

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`${summary.used} of ${summary.limit} runs used this month`}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex size-11 items-center justify-center rounded-lg hover:bg-muted md:size-8"
      >
        <svg viewBox="0 0 16 16" className="size-4 -rotate-90">
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            strokeWidth="2.5"
            className="stroke-border"
          />
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0.5, share * circumference)} ${circumference}`}
            className={`stroke-current ${tone}`}
          />
        </svg>
      </button>

      {open && (
        // Chat-only (founder call): this card is the chat's own tally and
        // nothing else. The month's story, refill date and history live in
        // the sidebar meter; repeating them here was noise. The ring itself
        // still fills against the month, the one bounded number.
        <div className="absolute bottom-full right-0 z-20 mb-2 rounded-lg border border-border bg-card px-3 py-2.5 whitespace-nowrap shadow-md">
          {/* The receipt line, folded at its colon: muted label above, the
              figure's line below. */}
          <div className="flex flex-col gap-1 text-left text-xs">
            <p className="text-muted-foreground">Total for this chat:</p>
            <p>
              <span className="tabular-nums font-medium">
                {summary.threadRuns}
              </span>{' '}
              {summary.threadRuns === 1 ? 'run' : 'runs'} this month.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
