'use client'

import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  // button doubles as a TooltipTrigger and one element cannot be two base-nova
  // triggers at once.
  const [open, setOpen] = useState(false)

  const pct = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0
  // Green is the app's action colour and stays rare, so a healthy meter is
  // plain ink. Colour arrives only when it means something: amber as the month
  // runs short, red when there is nothing left.
  const fill =
    pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-chart-4' : 'bg-foreground/70'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delay={300}>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full cursor-pointer rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent/60"
                aria-label="Usage this month"
              />
            }
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
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            See this month's runs
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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

      {runs === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading your runs...
        </p>
      ) : runs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing yet this month. Every time one of your agents does something
          for you, it will show up here.
        </p>
      ) : (
        <div className="max-h-96 divide-y overflow-y-auto rounded-xl border">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </>
  )
}

function RunRow({ run }: { run: RunHistoryEntry }) {
  const when = new Date(run.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
      <div className="flex min-w-0 flex-col">
        {/* The name is the one the agent had when it did the work. An agent can
            be deleted; what it did for you still happened. */}
        <span className="truncate text-sm font-medium">
          {run.agentName ?? 'A deleted agent'}
        </span>
        <span className="text-xs text-muted-foreground">
          {when}
          {run.source === 'schedule' ? ' · On a schedule' : ''}
        </span>
      </div>
      {run.status === 'failed' ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          Did not finish
        </span>
      ) : null}
    </div>
  )
}
