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
  const refillMonth = new Date(summary.resetsAt).toLocaleDateString('en-US', {
    month: 'long',
  })

  // r=6 in a 16px box; the dash pair draws pct% of the circumference.
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
        className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
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
        // Chat-first (founder call): inside a chat, this chat's runs take
        // center stage; the month is one supporting row, since its full
        // story lives in the sidebar meter.
        <div className="absolute bottom-full left-0 z-20 mb-2 w-60 rounded-xl border border-border bg-card p-4 shadow-md">
          <div className="flex flex-col gap-2.5 text-left">
            <p className="text-sm font-medium">This chat</p>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Runs this month</span>
              <span className="tabular-nums">{summary.threadRuns}</span>
            </div>
            <div className="border-t border-border pt-2.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">All your agents</span>
                <span className="tabular-nums">
                  {summary.used} / {summary.limit}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Fresh {summary.limit} on {refillMonth} 1.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
