'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ellipsis, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { RoutinesIcon } from '@/components/nav-icons'
import { RoutineSheet } from '@/components/routines/routine-sheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
      ? { label: 'Paused after failed runs', tone: 'red' }
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
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${cls}`} />
}

export function RoutinesList({
  routines,
  firstAgent,
}: {
  routines: RoutineListItem[]
  firstAgent: { id: string; name: string } | null
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
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {group.items.map((r) => {
              const state = rowState(r)
              return (
                <li
                  key={r.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-muted/40"
                  onClick={() => {
                    setSelected(r)
                    setOpen(true)
                  }}
                >
                  <StatusDot r={r} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.agentName}
                      {', '}
                      {r.sentence.charAt(0).toLowerCase() + r.sentence.slice(1)}
                    </p>
                  </div>

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
                  ) : mounted && r.nextRunAt ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Next {formatWhen(r.nextRunAt)}
                    </span>
                  ) : null}

                  {busy === r.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
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
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void runNow(r)}>
                          Run now
                        </DropdownMenuItem>
                        {r.status === 'active' ? (
                          <DropdownMenuItem
                            onClick={() => void patch(r.id, { action: 'pause' }, 'pause it')}
                          >
                            Pause
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => void patch(r.id, { action: 'resume' }, 'resume it')}
                          >
                            Resume
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => void remove(r.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
      />
    </>
  )
}
