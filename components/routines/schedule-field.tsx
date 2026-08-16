'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker, TimePicker } from '@/components/routines/pickers'
import { describeRule, ordinal, type RoutineRule } from '@/lib/routines/rule'

// The schedule, as a field you can change.
//
// It reads as the sentence you would say out loud, with the controls sitting
// inside the sentence: "Every [2] [weeks] on [M][W], at [09:00]". The line at
// the bottom is describeRule() on the rule being edited, so the words under
// the controls are literally the words that get saved. One interpreter
// (lib/routines/rule.ts) writes both.
//
// Every control heals itself instead of showing an error. A half-typed
// interval or a cleared time is kept as text while the field has focus and
// snapped back to the last runnable value on blur, so there is no state in
// which the sentence describes something that cannot run, and therefore no
// error message to write.

const UNITS = [
  { value: 'hour', one: 'hour', many: 'hours' },
  { value: 'day', one: 'day', many: 'days' },
  { value: 'week', one: 'week', many: 'weeks' },
  { value: 'month', one: 'month', many: 'months' },
] as const

// Monday first. The rule counts weeks from Monday (weekIndex in rule.ts), and
// a schedule is a working-week thing; a Sunday-led row would disagree with
// the arithmetic underneath it.
const DAYS = [
  { value: 1, short: 'M', name: 'Monday' },
  { value: 2, short: 'T', name: 'Tuesday' },
  { value: 3, short: 'W', name: 'Wednesday' },
  { value: 4, short: 'T', name: 'Thursday' },
  { value: 5, short: 'F', name: 'Friday' },
  { value: 6, short: 'S', name: 'Saturday' },
  { value: 0, short: 'S', name: 'Sunday' },
]

// Two rules are the same schedule if they say the same thing about every
// field the runner reads. Used for the dirty check and the "Undo" affordance.
export function sameRule(a: RoutineRule | null, b: RoutineRule | null): boolean {
  if (!a || !b) return a === b
  return (
    a.freq === b.freq &&
    a.interval === b.interval &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.anchor === b.anchor &&
    a.tz === b.tz &&
    (a.monthDay ?? null) === (b.monthDay ?? null) &&
    [...(a.byday ?? [])].sort().join() === [...(b.byday ?? [])].sort().join()
  )
}

function zoneWords(tz: string): string {
  return tz.replace(/_/g, ' ')
}

// The weekday the anchor falls on, which is the day a weekly rule keeps when
// it names none. Used to preselect, so nobody can build the empty weekly
// schedule that used to describe itself as "Every week on ,".
function anchorWeekday(anchor: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor)
  if (!m) return 1
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()
}

// The two transitions that are more than a field assignment, kept out of the
// component so they can be reasoned about (and tested) on their own.

// Turn a weekday on or off. A weekly rule must keep at least one day: turning
// the last one off is the empty state that used to read as "Every week on ,".
// The click is a no-op rather than a disabled button, which would look broken.
export function toggleDayIn(rule: RoutineRule, day: number): RoutineRule {
  const days = rule.byday ?? []
  const has = days.includes(day)
  if (has && days.length === 1 && rule.freq === 'week') return rule
  const next = has ? days.filter((d) => d !== day) : [...days, day].sort()
  return { ...rule, byday: next.length > 0 ? next : undefined }
}

// Change the unit, carrying over what still means something and dropping what
// does not. A weekday filter says nothing to an hourly or monthly rule, and a
// day of the month says nothing anywhere but a monthly one; left behind, they
// would quietly come back the moment the unit did.
export function withUnit(rule: RoutineRule, freq: RoutineRule['freq']): RoutineRule {
  const next: RoutineRule = { ...rule, freq }
  if (freq === 'hour' || freq === 'month') next.byday = undefined
  // Weekly needs a day and monthly needs a date; hand them the ones the
  // schedule already implies rather than making the person fill a blank.
  if (freq === 'week' && (rule.byday ?? []).length === 0) {
    next.byday = [anchorWeekday(rule.anchor)]
  }
  next.monthDay =
    freq === 'month'
      ? (rule.monthDay ?? (Number(rule.anchor.slice(8, 10)) || 1))
      : undefined
  return next
}

export function ScheduleField({
  value,
  saved,
  onChange,
}: {
  value: RoutineRule
  saved: RoutineRule
  onChange: (rule: RoutineRule) => void
}) {
  const [editing, setEditing] = useState(false)
  // Undo changes the rule from outside the editor, and the editor's typed
  // fields are seeded once on mount. Bumping this key remounts them so the
  // number in the box is never a schedule that was undone. Reach for a key
  // before reaching for an effect (the styleguide's rule).
  const [seed, setSeed] = useState(0)
  const changed = !sameRule(value, saved)

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground">When it runs</h3>
        <div className="flex items-center gap-3">
          {changed ? (
            <button
              type="button"
              onClick={() => {
                onChange(saved)
                setSeed((n) => n + 1)
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Undo
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-expanded={editing}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {editing ? 'Done' : 'Change'}
          </button>
        </div>
      </div>

      {editing ? (
        <Editor key={seed} value={value} onChange={onChange} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-left run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10"
        >
          <span className="block text-base md:text-sm">{describeRule(value)}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {zoneWords(value.tz)} time
          </span>
        </button>
      )}
    </section>
  )
}

function Editor({
  value,
  onChange,
}: {
  value: RoutineRule
  onChange: (rule: RoutineRule) => void
}) {
  // A text mirror for the one control that is still typed. It exists so the
  // box can be empty mid-keystroke without the rule underneath it going
  // invalid; it heals on blur, so no error message is needed.
  const [interval, setInterval] = useState(String(value.interval))

  const unit = UNITS.find((u) => u.value === value.freq) ?? UNITS[1]
  const plural = value.interval === 1 ? unit.one : unit.many
  const days = value.byday ?? []

  // The zone the person is standing in right now, which is not necessarily
  // the zone the routine was born in. Read at render because this component
  // only ever mounts on a click, well after hydration.
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  function set(patch: Partial<RoutineRule>) {
    onChange({ ...value, ...patch })
  }

  const monthDayNote =
    value.freq === 'month' &&
    typeof value.monthDay === 'number' &&
    value.monthDay > 28

  // One label column, one control column. Every control starts on the same
  // x and every control is the app's one height, so the rows read as a form
  // rather than as four things that happen to be stacked. Below md the label
  // sits above its control, which is the same shape a phone gets everywhere
  // else in the app.
  return (
    <div className="rounded-lg border border-input bg-card p-3 md:grid md:grid-cols-[6.5rem_1fr] md:items-center md:gap-x-3 md:gap-y-3 max-md:flex max-md:flex-col max-md:gap-3">
      <Label>Every</Label>
      <Row>
        <Input
          value={interval}
          inputMode="numeric"
          aria-label="How many"
          onChange={(e) => {
            const text = e.target.value.replace(/[^0-9]/g, '')
            setInterval(text)
            const n = Number(text)
            if (Number.isInteger(n) && n >= 1 && n <= 99) set({ interval: n })
          }}
          onBlur={() => setInterval(String(value.interval))}
          className="w-14 text-center"
        />
        <Select
          value={value.freq}
          onValueChange={(v) => {
            if (v) onChange(withUnit(value, v as RoutineRule['freq']))
          }}
        >
          <SelectTrigger
            className="h-11 w-28 md:h-8"
            aria-label="Hours, days, weeks or months"
          >
            <SelectValue>{() => plural}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {value.interval === 1 ? u.one : u.many}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      {/* Which days. Weekly picks them; daily filters them. */}
      {value.freq === 'day' || value.freq === 'week' ? (
        <>
          <Label>{value.freq === 'week' ? 'On' : 'Only on'}</Label>
          <Row>
            {DAYS.map((d) => {
              const on = days.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={on}
                  aria-label={d.name}
                  onClick={() => onChange(toggleDayIn(value, d.value))}
                  className={`size-11 rounded-lg border text-base run-focus-fade md:size-8 md:text-sm ${
                    on
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.short}
                </button>
              )
            })}
          </Row>
          {value.freq === 'day' && days.length === 0 ? (
            <Note>Nothing chosen means every day.</Note>
          ) : null}
        </>
      ) : null}

      {/* Which date of the month. */}
      {value.freq === 'month' ? (
        <>
          <Label>On the</Label>
          <Row>
            <Select
              value={String(value.monthDay ?? 1)}
              onValueChange={(v) => {
                if (!v) return
                set({ monthDay: v === 'last' ? 'last' : Number(v) })
              }}
            >
              <SelectTrigger className="h-11 w-32 md:h-8" aria-label="Day of the month">
                <SelectValue>
                  {(v) => (v === 'last' ? 'last day' : ordinal(Number(v)))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {ordinal(d)}
                  </SelectItem>
                ))}
                <SelectItem value="last">last day</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          {monthDayNote ? (
            <Note>
              A month without that date is skipped. Pick the last day to never
              skip one.
            </Note>
          ) : null}
        </>
      ) : null}

      {/* What time, in whose day. */}
      <Label>{value.freq === 'hour' ? 'Starting at' : 'At'}</Label>
      <Row>
        <TimePicker
          hour={value.hour}
          minute={value.minute}
          onChange={(hour, minute) => set({ hour, minute })}
        />
        <span className="text-sm text-muted-foreground">
          {zoneWords(value.tz)} time
        </span>
      </Row>
      {viewerTz && viewerTz !== value.tz ? (
        <Note>
          You are in {zoneWords(viewerTz)} right now. This routine keeps running
          on {zoneWords(value.tz)} time.{' '}
          <button
            type="button"
            onClick={() => set({ tz: viewerTz })}
            className="text-foreground underline underline-offset-2"
          >
            Move it to {zoneWords(viewerTz)}
          </button>
        </Note>
      ) : null}

      {/* The anchor. Only shown when it can change an outcome: at an interval
          of one, every day (or week, or month) fires, so what it counts from
          makes no difference. Hourly always counts from an instant. */}
      {value.interval > 1 || value.freq === 'hour' ? (
        <>
          <Label>Counting from</Label>
          <Row>
            <DatePicker value={value.anchor} onChange={(iso) => set({ anchor: iso })} />
          </Row>
          <Note>
            {value.freq === 'week'
              ? 'This is what decides which week it lands on.'
              : 'This is what decides which days it lands on.'}
          </Note>
        </>
      ) : null}

      {value.freq === 'hour' ? (
        <Note>
          It runs around the clock, through the night, and spends a run each
          time.
        </Note>
      ) : null}

      {/* The contract: whatever this line says is what gets saved. */}
      <p className="border-t border-border pt-3 text-sm font-medium md:col-span-2">
        {describeRule(value)}
      </p>
    </div>
  )
}

// The three shapes every row is built from. A label in its own column, the
// controls in theirs, and a note under the controls rather than under the
// whole row (it explains the control, so it lines up with the control).
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs text-muted-foreground max-md:mb-1.5 max-md:block">
      {children}
    </span>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground md:col-start-2 max-md:-mt-1.5">
      {children}
    </p>
  )
}
