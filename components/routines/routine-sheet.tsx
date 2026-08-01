'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CircleQuestionMark,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { AgentsIcon } from '@/components/nav-icons'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { formatWhen } from '@/components/routines/routines-list'
import type { RoutineListItem } from '@/lib/routines/list'
import { nextOccurrences } from '@/lib/routines/rule'

const noop = () => () => {}

// The ? beside a label, for the labels that genuinely need a second
// sentence: a heading, a plain explanation, and worked examples where they
// help. Only where hovering tells you something the label cannot.
function HelpTip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="What this means"
              className="inline-flex text-muted-foreground/70 hover:text-foreground"
            />
          }
        >
          <CircleQuestionMark className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {/* A plain block, one sentence or two. Anything longer belongs in
              the interface, not behind a question mark. */}
          <span className="block max-w-56">{children}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

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
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-base run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 md:text-sm"
            />
          </section>

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
              onChange={(e) => setInstruction(e.target.value)}
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
                    What it reported last time. The next run reads this so it
                    can say what changed. Forget clears it.
                  </HelpTip>
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
          {/* The schedule leads the rail (founder's call): it is the one
              fact that defines a routine, so it reads before the vitals. */}
          <div className="flex flex-col gap-1 border-b border-border pb-3.5">
            <span className="text-xs text-muted-foreground">Schedule</span>
            <p className="font-medium">
              {routine.sentence}
              {routine.rule
                ? ` (${routine.rule.tz.replace(/_/g, ' ')} time)`
                : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              To change it, ask {routine.agentName} in the chat.
            </p>
          </div>
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
            <span>
              About {routine.perMonth} {routine.perMonth === 1 ? 'run' : 'runs'} a
              month
            </span>
          </div>
          {mounted ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Created</span>
              <span className="tabular-nums">{formatWhen(routine.createdAt)}</span>
            </div>
          ) : null}
          {mounted && upcoming.length > 0 ? (
            <div className="flex flex-col gap-1.5 border-t border-border pt-3.5">
              <span className="text-xs text-muted-foreground">Next runs</span>
              <ul className="text-right tabular-nums">
                {upcoming.map((d) => (
                  <li key={d.toISOString()} className="py-0.5">
                    {formatWhen(d.toISOString())}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

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
        <span className="flex-1" />
        {/* Tooltips on the icon-only pair; the labeled buttons already say
            what they do. */}
        <TooltipProvider delay={300}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete this routine"
                  className="text-destructive"
                  onClick={() => onDelete(routine.id)}
                />
              }
            >
              <Trash2 className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Delete this routine
            </TooltipContent>
          </Tooltip>
          {routine.status === 'active' ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Pause this routine"
                    onClick={() => onPause(routine.id)}
                  />
                }
              >
                <Pause className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Pause
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Resume this routine"
                    onClick={() => onResume(routine.id)}
                  />
                }
              >
                <Play className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Resume
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
        <Button
          size="sm"
          disabled={!canSave || saving}
          onClick={() => {
            void save().then(() => close())
          }}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </>
  )
}
