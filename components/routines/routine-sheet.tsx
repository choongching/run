'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquare, Pause, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatWhen } from '@/components/routines/routines-list'
import type { RoutineListItem } from '@/lib/routines/list'
import { nextOccurrences } from '@/lib/routines/rule'

const noop = () => () => {}

// One routine, opened: a centered dialog, not a side drawer (founder's call
// after seeing both). Modeled on the same anatomy as the best routine
// editors: the work on the left (name, schedule, the standing brief, memory,
// recent runs), the facts on the right (status, next run, cost, created),
// and the actions along the bottom with icons. The schedule itself is
// changed by telling the agent in the chat, so the dialog says so instead of
// growing a builder.
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Full screen below md (the styleguide's mobile rule for big
          surfaces, same as the Configure panel); a centered card above it. */}
      <DialogContent className="flex flex-col gap-0 overflow-y-auto p-0 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none md:max-h-[85vh] sm:max-w-4xl">
        {routine ? (
          <DialogBody
            key={routine.id}
            routine={routine}
            onPause={onPause}
            onResume={onResume}
            onDelete={onDelete}
            close={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// Keyed by routine id so useState initializers re-seed when a different
// routine opens (the overlay-form pattern from config-panel).
function DialogBody({
  routine,
  onPause,
  onResume,
  onDelete,
  close,
}: {
  routine: RoutineListItem
  onPause: (id: string) => void
  onResume: (id: string) => void
  onDelete: (id: string) => void
  close: () => void
}) {
  const router = useRouter()
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  const [name, setName] = useState(routine.name)
  const [instruction, setInstruction] = useState(routine.instruction)
  const [saving, setSaving] = useState(false)
  const [forgetting, setForgetting] = useState(false)

  const dirty =
    name.trim() !== routine.name || instruction.trim() !== routine.instruction
  const canSave = dirty && name.trim().length > 0 && instruction.trim().length > 0

  const upcoming =
    routine.rule && routine.status === 'active'
      ? nextOccurrences(routine.rule, new Date(), 3)
      : []

  const statusWord =
    routine.status === 'active'
      ? 'Active'
      : routine.status === 'paused'
        ? 'Paused by you'
        : 'Paused by Run'

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/routines/${routine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), instruction: instruction.trim() }),
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
      <DialogHeader className="border-b border-border px-5 pt-5 pb-4">
        <DialogTitle>Routine</DialogTitle>
        <DialogDescription>
          {routine.sentence}
          {routine.rule ? ` (${routine.rule.tz.replace(/_/g, ' ')})` : ''}
          {'. '}To change the schedule itself, ask {routine.agentName} in the
          chat.
        </DialogDescription>
      </DialogHeader>

      <div className="grid flex-1 gap-6 px-5 py-5 md:grid-cols-[1fr_13rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <section>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
              Name
            </h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-base run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 md:text-sm"
            />
          </section>

          <section>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
              What it does each time
            </h3>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-base leading-relaxed run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 md:text-sm"
            />
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

        {/* The facts rail: read, not operated. Everything here answers "is
            this thing alive and what does it cost me" at a glance. */}
        <aside className="flex flex-col gap-3 text-sm md:border-l md:border-border md:pl-5">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-0.5">{statusWord}</p>
          </div>
          {mounted && upcoming.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground">Next runs</p>
              <ul className="mt-0.5 tabular-nums">
                {upcoming.map((d) => (
                  <li key={d.toISOString()}>{formatWhen(d.toISOString())}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="mt-0.5">
              About {routine.perMonth} {routine.perMonth === 1 ? 'run' : 'runs'} a
              month
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agent</p>
            <p className="mt-0.5 truncate">{routine.agentName}</p>
          </div>
          {mounted ? (
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="mt-0.5 tabular-nums">{formatWhen(routine.createdAt)}</p>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-border p-4">
        {/* Button asChild/render is not supported here; a link wearing the
            button classes is the codebase convention. */}
        <Link
          href={`/chat/${routine.agentId}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <MessageSquare className="size-3.5" />
          Open chat
        </Link>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete this routine"
          className="text-destructive"
          onClick={() => onDelete(routine.id)}
        >
          <Trash2 className="size-4" />
        </Button>
        {routine.status === 'active' ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Pause this routine"
            onClick={() => onPause(routine.id)}
          >
            <Pause className="size-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Resume this routine"
            onClick={() => onResume(routine.id)}
          >
            <Play className="size-4" />
          </Button>
        )}
        <Button
          size="sm"
          disabled={!canSave || saving}
          onClick={() => {
            void save().then(() => close())
          }}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </>
  )
}
