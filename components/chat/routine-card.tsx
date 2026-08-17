'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { CalendarClock, Check, Loader2 } from 'lucide-react'

import type { RoutineDraft } from '@/lib/tools/definitions'
import {
  describeCost,
  describeRule,
  nextOccurrences,
  validateRule,
  type RoutineRule,
} from '@/lib/routines/rule'

// A proposed routine, waiting for a yes.
//
// The card proves the schedule with real dates before the person agrees:
// "every other Wednesday" is ambiguous until you can see which Wednesdays,
// and a whole product exists where someone typed Monday and got Sundays. The
// dates are computed HERE, in the browser, because only the browser knows
// the person's timezone; the server finds it out when they confirm.
//
// It also states the cost. A routine is the only thing in Run that spends
// runs from the allowance while nobody is watching, so the price is on the
// card, not discovered on the meter three weeks later.
const noopSubscribe = () => () => {}

export function RoutineCard({
  draft,
  onDecision,
}: {
  draft: RoutineDraft
  onDecision: (decision: 'approve' | 'deny', tz: string) => void
}) {
  const [pending, setPending] = useState<'approve' | 'deny' | null>(null)
  // The dates are timezone- and locale-dependent, so they render only after
  // mount (the codebase rule for all time-formatted UI): a card restored on
  // reload is server-rendered first, and the server's locale is not the
  // person's.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )

  // Today's date and zone, captured once per card render on the client.
  const { rule, tz } = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const now = new Date()
    const anchor = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const rule: RoutineRule = { ...draft.rule, anchor, tz }
    return { rule, tz }
  }, [draft])

  const invalid = validateRule(rule)
  const dates = invalid ? [] : nextOccurrences(rule, new Date(), 3)

  function decide(decision: 'approve' | 'deny') {
    if (pending) return
    setPending(decision)
    onDecision(decision, tz)
  }

  return (
    <div className="rounded-xl border border-ring/60 bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="size-4 text-muted-foreground" />
        New routine
      </div>

      <div className="mt-3 rounded-lg border border-border bg-background p-3">
        <p className="text-sm font-medium">{draft.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {invalid ? 'The schedule did not come through.' : describeRule(rule)}
          {invalid ? '' : `, ${describeCost(rule).replace(/^About /, 'about ')}`}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {draft.instruction}
        </p>
      </div>

      {mounted && dates.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">
            So it will run on
          </p>
          <ul className="mt-1 text-sm tabular-nums">
            {dates.map((d) => (
              <li key={d.toISOString()} className="py-0.5">
                {d.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {', '}
                {d.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            Your time. It reads and reports on its own; anything it wants to
            send still waits for you.
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => decide('approve')}
          disabled={pending !== null || Boolean(invalid)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {pending === 'approve' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Set it up
        </button>
        <button
          type="button"
          onClick={() => decide('deny')}
          disabled={pending !== null}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {pending === 'deny' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Not now'
          )}
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Or tell me what to change
      </p>
    </div>
  )
}
