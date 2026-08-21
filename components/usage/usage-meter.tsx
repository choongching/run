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
import type { AgentSpend, RunHistoryEntry } from '@/lib/usage'

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
          // The whole card is a button into the history (founder call), so
          // the chevron in its title keeps the promise the card makes.
          <button
            type="button"
            onClick={() => {
              setHovering(false)
              setOpen(true)
            }}
            className="absolute bottom-full left-0 z-20 mb-2 w-60 cursor-pointer rounded-xl border border-border bg-card p-4 text-left shadow-md"
          >
            <RunsCard used={count} limit={limit} resetsAt={resetsAt} />
          </button>
        )}
      </div>
      {/* Full-screen below md (styleguide 5b): the dialog becomes the page.
          The centering transform is reset so inset-0 can take over. */}
      <DialogContent className="sm:max-w-2xl max-md:top-0 max-md:left-0 max-md:h-svh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:content-start max-md:rounded-none max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
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
  const [byAgent, setByAgent] = useState<AgentSpend[] | null>(null)

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
        if (event.status === 'completed') {
          onRun()
          // Keep the breakdown honest while the panel is open: bump the
          // agent's total, or add a first row for a brand-new spender.
          setByAgent((prev) => {
            if (prev === null) return prev
            const next = prev.map((a) =>
              a.agentId === event.agent_id ? { ...a, count: a.count + 1 } : a
            )
            if (!next.some((a) => a.agentId === event.agent_id)) {
              next.push({
                agentId: event.agent_id,
                agentName: event.agent_name,
                count: 1,
              })
            }
            return next.sort((a, b) => b.count - a.count)
          })
        }
      }),
    [userId, onRun]
  )

  useEffect(() => {
    let cancelled = false
    fetch('/api/usage/runs')
      .then((res) => (res.ok ? res.json() : { runs: [] }))
      .then((data) => {
        if (!cancelled) {
          setRuns(data.runs ?? [])
          setByAgent(data.byAgent ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuns([])
          setByAgent([])
        }
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
        <div className="flex flex-col gap-4">
          {/* The headline job: where did my month go. Biggest spender
              first, bars relative to it. */}
          {byAgent !== null && byAgent.length > 0 && (
            <div>
              {/* The section-label recipe the rest of the app uses. These
                  two were 12px muted, which read as captions under the
                  dialog's own description rather than as the two things it
                  holds. */}
              <p className="mb-2 text-sm font-medium">By agent</p>
              {/* Same box as every list in the app now: the border TOKEN, not
                  a bare border, and the radius one step down from the surface
                  it sits on. */}
              <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3.5">
                {byAgent.map((a) => (
                  <div key={a.agentId ?? 'deleted'}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">
                        {a.agentName ?? 'A deleted agent'}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {a.count} {a.count === 1 ? 'run' : 'runs'}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-foreground/70"
                        style={{
                          width: `${Math.max(2, Math.round((a.count / byAgent[0].count) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* The log: every run, newest first, each row a door back to the
              conversation that spent it. */}
          <div>
            <p className="mb-2 text-sm font-medium">Recent runs</p>
            <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {runs.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Loading and empty share one dashed box at one height, so the dialog
        // holds its shape instead of collapsing around a floating sentence and
        // jumping when the answer arrives.
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
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
  const failed = run.status === 'failed'

  const inner = (
    <>
      {/* The name is the one the agent had when it did the work. An agent can
          be deleted; what it did for you still happened. */}
      <span className="min-w-0 truncate text-sm font-medium">
        {run.agentName ?? 'A deleted agent'}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {/* A run that a schedule fired, not the person. The one word keeps
            the history honest when work happened while nobody was here. */}
        {run.source === 'schedule' && (
          <span className="flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
            Routine
          </span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {date} · {time}
        </span>
        {/* Status speaks only for the exception. A history of finished work
            needs no label saying it finished; "Done" on every row read as
            meaningless, and "Active" would misdescribe a past event. */}
        {failed && (
          <span className="flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
            Did not finish
          </span>
        )}
      </span>
    </>
  )

  // Flat on purpose (founder decision): a row is a receipt, not a door.
  // Linking only the rows whose agent still exists made some clickable and
  // some not, which read as broken; consistency beats the shortcut.
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-3.5 py-3">
      {inner}
    </div>
  )
}
