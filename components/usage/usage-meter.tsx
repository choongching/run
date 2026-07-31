'use client'

import { useEffect, useState } from 'react'
import { History } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RunsCard } from '@/components/usage/runs-card'
import { subscribeToRuns } from '@/lib/usage-live'
import type { RunHistoryEntry } from '@/lib/usage'

export type UsageMeterProps = {
  userId: string
  used: number
  limit: number
  resetsAt: string
}

// How much of the month is left, and what it went on.
//
// The number counts RUNS, not tokens: a token is our unit of cost and means
// nothing to someone deciding whether they can finish their work. Cost stays
// out of this surface entirely.
export function UsageMeter({ userId, used, limit, resetsAt }: UsageMeterProps) {
  // Seeded from the server, which is the only thing that knows whether a turn
  // actually counted: a run that failed, or paused to ask you something, is
  // not one. The chat client refreshes the route when a turn finishes, so the
  // number is server truth rather than a client guess.
  //
  // The caller keys this component by `used`, so a fresh server count remounts
  // it and re-seeds the state below. Syncing a prop into state from an effect
  // instead would fight React and is what the lint rule forbids.
  const [count, setCount] = useState(used)
  // The dialog is controlled here rather than by a DialogTrigger, because the
  // button also owns the hover card and needs its click for the dialog.
  const [open, setOpen] = useState(false)
  const [hovering, setHovering] = useState(false)

  const pct = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0
  // Green is the app's action colour and stays rare, so a healthy meter is
  // plain ink. Colour arrives only when it means something: amber as the month
  // runs short, red when there is nothing left.
  const fill =
    pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-chart-4' : 'bg-foreground/70'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* The hover card is the same breakdown the composer's donut shows,
          so both meters tell one story. It replaces the old one-line
          tooltip; the click-through hint moved into the card's footer. */}
      <div
        className="relative"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          onFocus={() => setHovering(true)}
          onBlur={() => setHovering(false)}
          className="w-full cursor-pointer rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent/60"
          aria-label="Usage this month"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium tabular-nums">
              {count.toLocaleString()}
              <span className="text-muted-foreground">
                {' / '}
                {limit.toLocaleString()}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">runs</span>
          </div>
          {/* The track is the hairline token, not the muted fill: muted and
              the sidebar canvas are within a shade of each other, so the
              unspent part of the month would read as empty space. */}
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-[width] ${fill}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </button>
        {hovering && (
          <div className="absolute bottom-full left-0 z-20 mb-2 w-60 rounded-xl border border-border bg-card p-4 shadow-md">
            <RunsCard used={count} limit={limit} resetsAt={resetsAt} />
          </div>
        )}
      </div>
      <DialogContent className="sm:max-w-xl">
        <UsageHistory
          userId={userId}
          count={count}
          limit={limit}
          resetsAt={resetsAt}
          onRun={() => setCount((n) => n + 1)}
        />
      </DialogContent>
    </Dialog>
  )
}

// Rendered inside DialogContent, which base-nova unmounts when closed, so the
// fetch below runs fresh each time the panel opens instead of holding a list
// that goes stale while nobody is looking at it.
function UsageHistory({
  userId,
  count,
  limit,
  resetsAt,
  onRun,
}: {
  userId: string
  count: number
  limit: number
  resetsAt: string
  onRun: () => void
}) {
  const [runs, setRuns] = useState<RunHistoryEntry[] | null>(null)

  // Live only while this panel is open. A socket held for the whole session
  // would spend a connection per tab, permanently, on a number that changes a
  // few times an hour and that nobody is looking at. Here it is bounded by the
  // panel being on screen, which is the only time the liveness is observable.
  // When scheduled runs land and work happens with nobody watching, widening
  // this back out is one line.
  useEffect(
    () =>
      subscribeToRuns(userId, (event) => {
        if (event.event_type !== 'mission_run') return
        setRuns((prev) =>
          prev === null
            ? prev
            : [
                {
                  id: event.id,
                  createdAt: event.created_at,
                  agentId: event.agent_id,
                  agentName: event.agent_name,
                  threadId: event.thread_id,
                  source: event.source,
                  status: event.status,
                  costUsd: event.cost_usd,
                },
                ...prev,
              ]
        )
        if (event.status === 'completed') onRun()
      }),
    [userId, onRun]
  )

  useEffect(() => {
    let cancelled = false
    fetch('/api/usage/runs')
      .then((res) => (res.ok ? res.json() : { runs: [] }))
      .then((data) => {
        if (!cancelled) setRuns(data.runs ?? [])
      })
      .catch(() => {
        if (!cancelled) setRuns([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const resets = new Date(resetsAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  })

  // Say it the way a person would: what you have used, then when you get more.
  // "132 of 200" is a status line, not a sentence, and nobody says their runs
  // "come back". When they are all gone, spell that out rather than making
  // someone compare two identical numbers.
  const summary =
    count >= limit
      ? `You've used all ${limit.toLocaleString()} of your runs this month.`
      : `You've used ${count.toLocaleString()} of your ${limit.toLocaleString()} runs this month.`

  return (
    <>
      <DialogHeader>
        <DialogTitle>Usage</DialogTitle>
        <DialogDescription>
          {summary} You get a fresh {limit.toLocaleString()} on {resets}.
        </DialogDescription>
      </DialogHeader>

      {runs !== null && runs.length > 0 ? (
        // A real table (founder call, after the stacked list): one run per
        // row, one fact per column, hairline grid.
        <div className="max-h-96 overflow-y-auto rounded-xl border">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className="border-b border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Agent
                </th>
                <th className="border-b border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Date
                </th>
                <th className="border-b border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Time
                </th>
                <th className="border-b border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Loading and empty share one dashed box at one height, so the dialog
        // holds its shape instead of collapsing around a floating sentence and
        // jumping when the answer arrives.
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
          {runs === null ? (
            <p className="text-sm text-muted-foreground">Loading your runs...</p>
          ) : (
            <>
              <span className="mb-4 flex size-11 items-center justify-center rounded-lg border border-border bg-background">
                <History className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium">No runs yet this month</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Everything your agents do for you will land here.
              </p>
            </>
          )}
        </div>
      )}
    </>
  )
}

function RunRow({ run }: { run: RunHistoryEntry }) {
  const at = new Date(run.createdAt)
  const date = at.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
  const time = at.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
  // A status column states the status; a dash read as missing data
  // (founder caught it). "Done" for the ordinary case.
  const status = run.status === 'failed' ? 'Did not finish' : 'Done'

  return (
    <tr className="border-b border-border last:border-b-0">
      {/* The name is the one the agent had when it did the work. An agent can
          be deleted; what it did for you still happened. */}
      <td className="max-w-48 truncate border-r border-border px-3 py-2.5 font-medium">
        {run.agentName ?? 'A deleted agent'}
      </td>
      <td className="whitespace-nowrap border-r border-border px-3 py-2.5 text-muted-foreground tabular-nums">
        {date}
      </td>
      <td className="whitespace-nowrap border-r border-border px-3 py-2.5 text-muted-foreground tabular-nums">
        {time}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{status}</td>
    </tr>
  )
}
