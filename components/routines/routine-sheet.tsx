'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { AgentsIcon } from '@/components/nav-icons'
import { Button, buttonVariants } from '@/components/ui/button'
import { HelpTip } from '@/components/ui/help-tip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatWhen } from '@/components/routines/routines-list'
import { sameRule, ScheduleField } from '@/components/routines/schedule-field'
import { DeliveryField } from '@/components/routines/delivery-field'
import type { RoutineListItem } from '@/lib/routines/list'
import {
  describeCost,
  nextOccurrences,
  runsPerMonth,
  type RoutineRule,
} from '@/lib/routines/rule'

const noop = () => () => {}

// The cost line twice over: once as a statement, once as the tail of "was".
function costTail(rule: RoutineRule): string {
  const said = describeCost(rule)
  return said.startsWith('About ')
    ? said.slice(6)
    : said.charAt(0).toLowerCase() + said.slice(1)
}

// One routine, opened: a centered dialog, not a side drawer (founder's call
// after seeing both). The anatomy holds one rule: the left column is what you
// change (name, schedule, the standing brief, memory) and the right rail is
// what results (next runs, status, cost, created).
//
// The schedule used to sit in the rail with a line saying to go and ask the
// agent in the chat. That reversed the rule, because the schedule is the one
// cause every other fact in the rail depends on. It moved left and became a
// field; the rail now leads with the dates it produces, which is the same
// founder decision (the defining fact leads) pointed at the consequence
// instead of the cause. Telling the agent in the chat still works.
export function RoutineSheet({
  routine,
  open,
  onOpenChange,
  onPause,
  onResume,
  onDelete,
  runLimit,
  otherRoutinesPerMonth,
  telegramPaired,
}: {
  routine: RoutineListItem | null
  telegramPaired: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onDelete: (id: string) => void
  // The plan's monthly runs, and what the person's OTHER routines already
  // claim of it, so an edit can say what it costs against what is left.
  runLimit: number
  otherRoutinesPerMonth: number
}) {
  // Closing with unsaved work asks first. The dirty flag is reported up from
  // the body's own change handlers rather than read out of it, because the
  // body is keyed and remounts, and because syncing props into state through
  // an effect is the lint this codebase already learned about.
  const [dirty, setDirty] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function requestClose(next: boolean) {
    if (!next && dirty) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    setDirty(false)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      {/* Full screen below md (the styleguide's mobile rule for big
          surfaces, same as the Configure panel); a centered card above it. */}
      {/* Header and footer pinned, only the middle scrolls (founder's call,
          matching the reference): the title and the actions are always in
          reach no matter how long the brief or the run history grows. */}
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none md:h-[85vh] md:max-h-[85vh] sm:max-w-4xl">
        {routine ? (
          <DialogBody
            key={routine.id}
            routine={routine}
            onPause={onPause}
            onResume={onResume}
            onDelete={onDelete}
            runLimit={runLimit}
            otherRoutinesPerMonth={otherRoutinesPerMonth}
            telegramPaired={telegramPaired}
            confirming={confirming}
            onKeepEditing={() => setConfirming(false)}
            onDirtyChange={setDirty}
            close={() => {
              setDirty(false)
              setConfirming(false)
              onOpenChange(false)
            }}
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
  runLimit,
  otherRoutinesPerMonth,
  telegramPaired,
  confirming,
  onKeepEditing,
  onDirtyChange,
  close,
}: {
  routine: RoutineListItem
  onPause: (id: string) => void
  onResume: (id: string) => void
  onDelete: (id: string) => void
  runLimit: number
  otherRoutinesPerMonth: number
  telegramPaired: boolean
  confirming: boolean
  onKeepEditing: () => void
  onDirtyChange: (dirty: boolean) => void
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
  const [rule, setRule] = useState<RoutineRule | null>(routine.rule)
  const [saving, setSaving] = useState(false)
  const [forgetting, setForgetting] = useState(false)
  // Forget has no undo and the next run's quality depends on what it clears,
  // so the word is asked for twice.
  const [confirmForget, setConfirmForget] = useState(false)

  const scheduleDirty = !sameRule(rule, routine.rule)
  const dirty =
    name.trim() !== routine.name ||
    instruction.trim() !== routine.instruction ||
    scheduleDirty
  const canSave = dirty && name.trim().length > 0 && instruction.trim().length > 0

  // Reported from the handlers, never from render: the parent needs to know
  // before it lets Escape or the backdrop close the dialog.
  function report(next: {
    name?: string
    instruction?: string
    rule?: RoutineRule | null
  }) {
    const n = next.name ?? name
    const i = next.instruction ?? instruction
    const r = next.rule !== undefined ? next.rule : rule
    onDirtyChange(
      n.trim() !== routine.name ||
        i.trim() !== routine.instruction ||
        !sameRule(r, routine.rule)
    )
  }

  // Every date and every number in the rail comes from the rule being
  // edited, so the consequence of a change is visible before it is saved.
  // A paused routine normally shows no dates (they are not going to happen);
  // while its schedule is being changed it shows them anyway, because that
  // is the only way to see what the change did.
  const upcoming =
    rule && (routine.status === 'active' || scheduleDirty)
      ? nextOccurrences(rule, new Date(), 3)
      : []
  const wasNext = scheduleDirty && routine.rule
    ? nextOccurrences(routine.rule, new Date(), 1)[0]
    : null
  const perMonth = rule ? runsPerMonth(rule) : 0
  const cost = rule ? describeCost(rule) : 'No schedule'
  // The warning fires on what all of this person's routines would want,
  // because that is the number the runner will actually check them against.
  const overAllowance = otherRoutinesPerMonth + perMonth > runLimit

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
        body: JSON.stringify({
          name: name.trim(),
          instruction: instruction.trim(),
          // Sent only when it changed, so an ordinary rename never touches
          // the schedule or moves the next run.
          ...(scheduleDirty && rule ? { rule } : {}),
        }),
      })
      if (!res.ok) {
        // The server writes these sentences (validateRule's messages are
        // already written for a person), so show what it said.
        const body = await res.json().catch(() => null)
        toast.error(body?.error ?? 'The change could not be saved.')
        return
      }
      toast.success(
        scheduleDirty
          ? 'Saved. The new schedule starts from the next run.'
          : 'Saved. It applies from the next run.'
      )
      onDirtyChange(false)
      router.refresh()
      return true
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
      setConfirmForget(false)
    }
  }

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-border px-6 pt-6 pb-5">
        <DialogTitle>Edit routine</DialogTitle>
        <DialogDescription>Changes apply from the next run.</DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-8 overflow-y-auto px-6 py-6 md:grid-cols-[1fr_16rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
              Routine name
            </h3>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                report({ name: e.target.value })
              }}
              maxLength={80}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-base run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 md:text-sm"
            />
          </section>

          {/* The schedule, second: a routine is a time and a task, in that
              order, and the task below reads as what happens at that time. */}
          {rule ? (
            <ScheduleField
              value={rule}
              saved={routine.rule ?? rule}
              onChange={(next) => {
                setRule(next)
                report({ rule: next })
              }}
            />
          ) : (
            <section>
              <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
                When it runs
              </h3>
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                This routine&rsquo;s schedule cannot be read, so it will not
                run. Delete it and ask {routine.agentName} for a new one.
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              What it does each time
              <HelpTip>
                The instruction the agent gets on every run. It stands alone;
                the chat history is not included.
              </HelpTip>
            </h3>
            <textarea
              value={instruction}
              onChange={(e) => {
                setInstruction(e.target.value)
                report({ instruction: e.target.value })
              }}
              rows={6}
              className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-base leading-relaxed run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 md:text-sm"
            />
          </section>

          {routine.carry ? (
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  What it remembers from last time
                  <HelpTip>
                    Each run starts fresh; this note is the only thing it
                    keeps from last time, so it can say what changed. Forget
                    clears it.
                  </HelpTip>
                </h3>
                {confirmForget ? (
                  <span className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setConfirmForget(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Keep it
                    </button>
                    <button
                      type="button"
                      onClick={() => void forget()}
                      disabled={forgetting}
                      className="text-destructive hover:underline"
                    >
                      Forget it, yes
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmForget(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Forget
                  </button>
                )}
              </div>
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {routine.carry.length > 600
                  ? `${routine.carry.slice(0, 600)}…`
                  : routine.carry}
              </p>
            </section>
          ) : null}

          <DeliveryField
            routineId={routine.id}
            initialOn={routine.deliverTelegram}
            initialPaired={telegramPaired}
          />

          {/* No Recent runs section. It went through two shapes (headlines,
              then a status ledger) and the founder cut it with the right
              question: "I can't act on it." Everything it said already
              lives where acting is possible: the list row carries the last
              failure and its error, the failure message lands in the chat,
              and three failures pause the routine visibly. */}
        </div>

        {/* The facts rail: read, not operated. Label on the left, value on
            the right, one fact per row (the founder pointed at SureThing's
            rail: a definition table reads faster than stacked blocks
            because the eye keeps one column for questions and one for
            answers). */}
        <aside className="flex flex-col gap-3.5 text-sm md:border-l md:border-border md:pl-6">
          {/* The dates lead the rail (the founder's rule that the defining
              fact reads first, now pointed at the consequence: the schedule
              itself is a control on the left, and these are what it does).
              They recompute as the field is edited, so nobody agrees to a
              schedule they have not seen land on real days. */}
          {mounted && upcoming.length > 0 ? (
            <div className="flex flex-col gap-1.5 border-b border-border pb-3.5">
              <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                {routine.status === 'active' ? 'Next runs' : 'Next runs when resumed'}
                {scheduleDirty ? (
                  <span className="text-xs text-chart-4">after saving</span>
                ) : null}
              </span>
              <ul className="text-right tabular-nums">
                {upcoming.map((d) => (
                  <li key={d.toISOString()} className="py-0.5">
                    {formatWhen(d.toISOString())}
                  </li>
                ))}
              </ul>
              {wasNext ? (
                <span className="text-right text-xs text-muted-foreground">
                  was {formatWhen(wasNext.toISOString())}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Status</span>
            <span
              className={
                routine.status === 'active'
                  ? 'rounded-md bg-chart-1/15 px-2 py-0.5 text-xs font-medium text-chart-1'
                  : routine.status === 'paused_system'
                    ? 'rounded-md bg-chart-4/15 px-2 py-0.5 text-xs font-medium text-chart-4'
                    : 'rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
              }
            >
              {statusWord}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Agent</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <AgentsIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{routine.agentName}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Cost
              <HelpTip>
                Runs come out of the same monthly allowance as your chats. If
                you run out, the routine pauses itself.
              </HelpTip>
            </span>
            <span className="text-right">
              {cost}
              {scheduleDirty && routine.rule && cost !== describeCost(routine.rule) ? (
                <span className="block text-xs text-muted-foreground">
                  was {costTail(routine.rule)}
                </span>
              ) : null}
            </span>
          </div>
          {overAllowance ? (
            <p className="text-xs text-chart-4">
              Your routines want {otherRoutinesPerMonth + perMonth} runs a
              month. You get {runLimit}. They pause themselves when the month
              runs out.
            </p>
          ) : null}
          {mounted ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Created</span>
              <span className="tabular-nums">{formatWhen(routine.createdAt)}</span>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Trying to leave with unsaved work asks here, in the footer, rather
          than in a second dialog stacked on this one. */}
      {confirming ? (
        <div className="mt-auto flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-muted p-4">
          <span className="flex-1 text-sm">
            Your changes are not saved yet.
          </span>
          <Button variant="ghost" size="sm" onClick={close}>
            Discard them
          </Button>
          <Button size="sm" onClick={onKeepEditing}>
            Keep editing
          </Button>
        </div>
      ) : null}

      <div className="mt-auto flex shrink-0 items-center gap-2 border-t border-border p-4">
        {/* Button asChild/render is not supported here; a link wearing the
            button classes is the codebase convention. */}
        <Link
          href={`/chat/${routine.agentId}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <MessageSquare className="size-3.5" />
          {/* Livelier than the list's "Chat with X" and safe here: the rail
              names the agent right beside it, so whose chat is not in
              question inside this dialog. */}
          Jump to the chat
        </Link>
        {/* Labelled, not icon-only. One of these deletes a routine and it
            was a red icon with no word on it, sitting a thumb's width from
            Save changes. The pair sits with Jump to the chat because they
            are things you do to this routine, and Save is the only action
            on the trailing edge. */}
        {routine.status === 'active' ? (
          <Button variant="ghost" size="sm" onClick={() => onPause(routine.id)}>
            <Pause className="size-3.5" />
            Pause
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onResume(routine.id)}>
            <Play className="size-3.5" />
            Resume
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(routine.id)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
        <span className="flex-1" />
        <Button
          size="sm"
          disabled={!canSave || saving}
          onClick={() => {
            // Stay open when the save failed, so the words are still there
            // to fix rather than lost behind a toast.
            void save().then((ok) => {
              if (ok) close()
            })
          }}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </>
  )
}
