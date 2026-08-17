'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Ellipsis,
  Eye,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { AgentsIcon, RoutinesIcon } from '@/components/nav-icons'
import { RoutineSheet } from '@/components/routines/routine-sheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TruncatedLabel } from '@/components/ui/truncated-label'
import { needsAttention, type RoutineListItem } from '@/lib/routines/list'

// The quiet list. The name is the only loud thing on a row; status lives on
// the right edge, and colour appears only where there is something to do.
// Grouped by whether it needs the person, so the two actionable rows are
// always at the top and everything below is scanned, not read.

const noop = () => () => {}

// Dates render only after mount so they show in the viewer's timezone, not
// the server's (same rule as the chat thread).
function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}

export function formatWhen(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) +
    ', ' +
    new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
}

// What the right edge of a row says, and how loudly.
function rowState(r: RoutineListItem): {
  label: string
  tone: 'quiet' | 'amber' | 'red'
} {
  if (r.status === 'paused_system') {
    return r.consecutiveFailures >= 3
      ? { label: 'Paused after 3 failed runs', tone: 'red' }
      : { label: 'Paused, out of runs', tone: 'amber' }
  }
  if (r.consecutiveFailures >= 3) return { label: 'Failing', tone: 'red' }
  if (r.status === 'paused') return { label: 'Paused', tone: 'quiet' }
  return { label: '', tone: 'quiet' }
}

function StatusDot({ r }: { r: RoutineListItem }) {
  const cls = needsAttention(r)
    ? 'bg-chart-4'
    : r.status === 'active'
      ? 'bg-chart-1'
      : 'border border-muted-foreground/50 bg-transparent'
  // `block` is load-bearing: a span is inline, and an inline box ignores
  // width and height, so without it the dot is nothing but its own border
  // smeared down a line box.
  return <span aria-hidden className={`block size-1.5 shrink-0 rounded-full ${cls}`} />
}

export function RoutinesList({
  routines,
  firstAgent,
  runLimit,
}: {
  routines: RoutineListItem[]
  firstAgent: { id: string; name: string } | null
  // The plan's monthly runs. Only the open routine uses it, to say whether
  // an edited schedule wants more than the month holds.
  runLimit: number
}) {
  const router = useRouter()
  const mounted = useMounted()
  const [busy, setBusy] = useState<string | null>(null)
  // The selected routine survives the sheet's exit animation; `open` alone
  // drives visibility (the overlay pattern from the styleguide).
  const [selected, setSelected] = useState<RoutineListItem | null>(null)
  const [open, setOpen] = useState(false)

  async function patch(id: string, body: Record<string, unknown>, doing: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/routines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? `Could not ${doing}.`)
        return
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function remove(id: string) {
    setBusy(id)
    try {
      await fetch(`/api/routines/${id}`, { method: 'DELETE' })
      setOpen(false)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  // Run it right now, exactly as the schedule would. Synchronous on purpose:
  // the row shows a spinner for the real duration of a real agent run, and
  // the result is in the agent's chat when it finishes.
  async function runNow(r: RoutineListItem) {
    setBusy(r.id)
    try {
      const res = await fetch(`/api/routines/${r.id}/run`, { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'The run could not start.')
        return
      }
      toast.success(`Done. The result is in ${r.agentName}'s chat.`)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (routines.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-14 text-center">
        <span className="mb-5 flex size-11 items-center justify-center rounded-lg border border-border bg-background">
          <RoutinesIcon className="size-5 text-muted-foreground" />
        </span>
        <h2 className="text-base font-medium">No routines yet</h2>
        <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
          Open any of your agents and ask for one. Say when, and say what.
        </p>
        {/* Worked examples, because the blank box is the hard part. Each one
            opens the chat with the sentence already typed, ready to edit and
            send; nothing is sent for the person. */}
        <div className="mt-5 flex w-full max-w-md flex-col gap-1.5 text-left">
          {[
            'Create a routine that checks my inbox every weekday at 8am and tells me what needs a reply.',
            'Create a routine that reads my calendar every Monday at 8am and tells me what the week holds.',
            'Create a routine that finds my unanswered emails every Friday at 5pm.',
          ].map((s) =>
            firstAgent ? (
              <Link
                key={s}
                href={`/chat/${firstAgent.id}?prefill=${encodeURIComponent(s)}`}
                className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {s}
              </Link>
            ) : (
              <p
                key={s}
                className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-muted-foreground"
              >
                {s}
              </p>
            )
          )}
        </div>
      </div>
    )
  }

  const groups: { title: string; items: RoutineListItem[] }[] = [
    { title: 'Needs you', items: routines.filter(needsAttention) },
    {
      title: 'Active',
      items: routines.filter((r) => r.status === 'active' && !needsAttention(r)),
    },
    { title: 'Paused', items: routines.filter((r) => r.status === 'paused') },
  ].filter((g) => g.items.length > 0)

  return (
    <>
      {groups.map((group) => (
        <div key={group.title} className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <span className="text-sm font-medium">{group.title}</span>
            <span className="text-sm text-muted-foreground">
              {group.items.length}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <ul className="flex flex-col gap-3">
            {group.items.map((r) => {
              const state = rowState(r)
              const lastRun = r.runs[0] ?? null
              return (
                <li
                  key={r.id}
                  className="group flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-card px-3.5 py-4 hover:bg-muted/40"
                  onClick={() => {
                    setSelected(r)
                    setOpen(true)
                  }}
                >
                  {/* The icon tile from the knowledge-list recipe, with the
                      status dot riding its corner: the tile says what kind
                      of thing this is, the dot says how it is doing. */}
                  <span className="relative shrink-0">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-background">
                      <RoutinesIcon className="size-4 text-muted-foreground" />
                    </span>
                    <span className="absolute -top-0.5 -right-0.5">
                      <StatusDot r={r} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* The name is the one loud thing on the row. 15px is a
                        deliberate off-scale size (founder's eye): base read
                        a hair heavy against the two-line row, sm read as a
                        label. Same sanctioned-exception treatment as the
                        home greeting. */}
                    <p className="truncate text-[15px]/6 font-medium">{r.name}</p>
                    {/* "By" plus the agent icon, because a bare name under a
                        bare name said nothing about how the two relate: the
                        routine is the job, the agent is who does it. */}
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      By <AgentsIcon className="size-3.5 shrink-0" />
                      {r.agentName}
                    </p>
                    {/* No last-run snippet here (founder's call: rows stay
                        minimal; in practice agents title reports after the
                        routine, so the snippet read as a duplicate). The one
                        exception is a FAILURE, which is the fact a list must
                        never hide. The full run history lives in details. */}
                    {lastRun?.status === 'failed' ? (
                      <p className="mt-2 truncate text-sm text-destructive/90">
                        Last run did not finish
                        {lastRun.error ? `: ${lastRun.error}` : ''}
                      </p>
                    ) : null}
                  </div>

                  {/* One trailing cluster, vertically centered against the
                      two-line row, so the date, the icons and the menu read
                      as a single group rather than three floats. */}
                  <span className="flex items-center gap-1.5 self-center">
                  {state.label ? (
                    <span
                      className={
                        state.tone === 'red'
                          ? 'rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive'
                          : state.tone === 'amber'
                            ? 'rounded-md bg-chart-4/15 px-2 py-0.5 text-xs font-medium text-chart-4'
                            : 'text-xs text-muted-foreground'
                      }
                    >
                      {state.label}
                    </span>
                  ) : (
                    <span className="text-right text-xs text-muted-foreground tabular-nums">
                      {/* "Repeats" states the pattern (founder's wording);
                          the date underneath is the next concrete firing.
                          Kept separate because "Repeats Wed 12 Aug" would
                          be a false sentence: the 12th does not repeat. */}
                      <span className="block">
                        Repeats {r.sentence.charAt(0).toLowerCase() + r.sentence.slice(1)}
                      </span>
                      {mounted && r.nextRunAt ? (
                        <span className="block text-muted-foreground/70">
                          Next: {formatWhen(r.nextRunAt)}
                        </span>
                      ) : null}
                    </span>
                  )}

                  {busy === r.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      {/* The quick actions, revealed on hover the way every
                          mature list does it: icons for the things you do
                          weekly, the menu for everything. Hidden on touch
                          screens, where the menu carries it all. */}
                      <span
                        className="hidden items-center gap-0.5 md:group-hover:flex"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TooltipProvider delay={300}>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Run ${r.name} now`}
                                  className="text-primary hover:text-primary"
                                  onClick={() => void runNow(r)}
                                />
                              }
                            >
                              {/* Filled and in the primary color: the hero
                                  action of the cluster. The others stay
                                  muted outlines. */}
                              <Play className="size-4 fill-current" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={8}>
                              Run now
                            </TooltipContent>
                          </Tooltip>
                          {r.status === 'active' ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Pause ${r.name}`}
                                    className="text-muted-foreground"
                                    onClick={() =>
                                      void patch(r.id, { action: 'pause' }, 'pause it')
                                    }
                                  />
                                }
                              >
                                <Pause className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent side="bottom" sideOffset={8}>
                                Pause
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Open ${r.agentName}'s chat`}
                                  className="text-muted-foreground"
                                  onClick={() => router.push(`/chat/${r.agentId}`)}
                                />
                              }
                            >
                              <MessageSquare className="size-4" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={8}>
                              {/* Names the destination, not just the act:
                                  the row just taught that the routine and
                                  the agent are different things. */}
                              Chat with {r.agentName}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground"
                            aria-label={`Actions for ${r.name}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          />
                        }
                      >
                        <Ellipsis className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-52"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        {/* The row itself opens the sheet, but nothing says
                            so; the menu is where people look, so the door is
                            named here too. */}
                        <DropdownMenuItem
                          onClick={() => {
                            setSelected(r)
                            setOpen(true)
                          }}
                        >
                          <Eye className="size-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void runNow(r)}>
                          <Play className="size-4" />
                          Run now
                        </DropdownMenuItem>
                        {r.status === 'active' ? (
                          <DropdownMenuItem
                            onClick={() => void patch(r.id, { action: 'pause' }, 'pause it')}
                          >
                            <Pause className="size-4" />
                            Pause
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => void patch(r.id, { action: 'resume' }, 'resume it')}
                          >
                            <Play className="size-4" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => router.push(`/chat/${r.agentId}`)}
                        >
                          <MessageSquare className="size-4 shrink-0" />
                          {/* One line always; a long agent name truncates,
                              and TruncatedLabel reveals the full name on
                              hover only when something is actually hidden. */}
                          <TruncatedLabel
                            text={`Chat with ${r.agentName}`}
                            className="max-w-48"
                            side="left"
                          />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => void remove(r.id)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </>
                  )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <RoutineSheet
        routine={selected}
        open={open}
        onOpenChange={setOpen}
        onPause={(id) => void patch(id, { action: 'pause' }, 'pause it')}
        onResume={(id) => void patch(id, { action: 'resume' }, 'resume it')}
        onDelete={(id) => void remove(id)}
        runLimit={runLimit}
        // What the person's OTHER active routines already claim of the
        // month. Paused ones are not spending, so they are not counted.
        otherRoutinesPerMonth={routines
          .filter((r) => r.id !== selected?.id && r.status === 'active')
          .reduce((sum, r) => sum + r.perMonth, 0)}
      />
    </>
  )
}
