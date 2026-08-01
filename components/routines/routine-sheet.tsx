'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatWhen } from '@/components/routines/routines-list'
import type { RoutineListItem } from '@/lib/routines/list'
import { nextOccurrences } from '@/lib/routines/rule'

const noop = () => () => {}

// One routine, opened. What it will do next, what it is told each time, what
// it remembers, and what its last runs actually did. The routine keeps
// rendering through the sheet's exit animation because the parent holds the
// selected record separately from the open flag.
export function RoutineSheet({
  routine,
  open,
  onOpenChange,
  onPause,
  onResume,
  onDelete,
}: {
  routine: RoutineListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        {routine ? (
          <SheetBody
            key={routine.id}
            routine={routine}
            onPause={onPause}
            onResume={onResume}
            onDelete={onDelete}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// Keyed by routine id so useState initializers re-seed when a different
// routine opens (the overlay-form pattern from config-panel).
function SheetBody({
  routine,
  onPause,
  onResume,
  onDelete,
}: {
  routine: RoutineListItem
  onPause: (id: string) => void
  onResume: (id: string) => void
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  const [instruction, setInstruction] = useState(routine.instruction)
  const [saving, setSaving] = useState(false)
  const [forgetting, setForgetting] = useState(false)

  const upcoming =
    routine.rule && routine.status === 'active'
      ? nextOccurrences(routine.rule, new Date(), 3)
      : []

  async function saveInstruction() {
    setSaving(true)
    try {
      const res = await fetch(`/api/routines/${routine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      })
      if (!res.ok) {
        toast.error('The change could not be saved.')
        return
      }
      toast.success('Saved. It applies from the next run.')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function forget() {
    setForgetting(true)
    try {
      await fetch(`/api/routines/${routine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearCarry: true }),
      })
      router.refresh()
    } finally {
      setForgetting(false)
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{routine.name}</SheetTitle>
        <SheetDescription>
          {routine.agentName}
          {', '}
          {routine.sentence.charAt(0).toLowerCase() + routine.sentence.slice(1)}
          {routine.rule ? ` (${routine.rule.tz.replace(/_/g, ' ')})` : ''}
          {'. '}About {routine.perMonth}{' '}
          {routine.perMonth === 1 ? 'run' : 'runs'} a month.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
        {upcoming.length > 0 && mounted ? (
          <section>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
              Next three runs
            </h3>
            <ul className="text-sm tabular-nums">
              {upcoming.map((d) => (
                <li key={d.toISOString()} className="py-0.5">
                  {formatWhen(d.toISOString())}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
            What it does each time
          </h3>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-base run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 md:text-sm"
          />
          {instruction.trim() !== routine.instruction ? (
            <Button
              size="sm"
              className="mt-2"
              disabled={saving || !instruction.trim()}
              onClick={() => void saveInstruction()}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Save
            </Button>
          ) : null}
        </section>

        {routine.carry ? (
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground">
                What it remembers from last time
              </h3>
              <button
                type="button"
                onClick={() => void forget()}
                disabled={forgetting}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Forget
              </button>
            </div>
            <p className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {routine.carry.length > 600
                ? `${routine.carry.slice(0, 600)}…`
                : routine.carry}
            </p>
          </section>
        ) : null}

        {routine.runs.length > 0 ? (
          <section>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
              Recent runs
            </h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {routine.runs.map((run) => (
                <li key={run.startedAt} className="flex items-start gap-2.5 px-3 py-2.5">
                  <span
                    aria-hidden
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      run.status === 'failed'
                        ? 'bg-destructive'
                        : run.status === 'completed'
                          ? 'bg-chart-1'
                          : 'bg-chart-4'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {run.headline ?? run.error ?? 'Ran'}
                    </p>
                    {mounted ? (
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {formatWhen(run.startedAt)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border p-4">
        {routine.status === 'active' ? (
          <Button variant="outline" size="sm" onClick={() => onPause(routine.id)}>
            Pause
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onResume(routine.id)}>
            Resume
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(routine.id)}
        >
          Delete
        </Button>
      </div>
    </>
  )
}
