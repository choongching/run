import type { Json } from '@/lib/types/database'

// The schedule rule for a routine, stored as jsonb on routines.rule.
//
// An interval rule, not a cron string, because cron cannot say the things
// people actually ask for: it has no interval on weeks ("every 2 weeks" is
// inexpressible) and its day-of-month field resets each month ("every 10
// days" becomes the 1st, 11th, 21st, 31st, then a jump). The anchor date is
// what makes intervals mean anything: "every 2 weeks on Wednesday" has no
// phase until you say which Wednesday it counts from.
//
// This file is the rule's ONLY interpreter. The database stores it, the API
// passes it through, and everything that needs a date or a sentence asks
// here. Times are wall-clock in the rule's own IANA timezone, so "8:00am"
// stays 8:00am through daylight saving instead of drifting an hour.
export type RoutineRule = {
  freq: 'hour' | 'day' | 'week' | 'month'
  // Every N units. The floor is hourly: nothing below an hour exists in the
  // type, because a run spends real money from a monthly allowance.
  interval: number
  // Weekdays the rule fires on, 0 = Sunday .. 6 = Saturday (the JS getDay
  // convention). For 'week' this picks the days; for 'day' it filters them
  // (interval 1 + byday Mon-Fri is "every weekday").
  byday?: number[]
  // For 'month': which day. 29-31 skip months that lack the day; 'last'
  // never skips. Defaults to the anchor's day of month.
  monthDay?: number | 'last'
  hour: number
  minute: number
  // ISO date (YYYY-MM-DD) the intervals count from.
  anchor: string
  // IANA zone name, captured from the person's browser when the routine is
  // made. Stored per routine: a schedule keeps the timezone it was born in.
  tz: string
}

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// ---------------------------------------------------------------------------
// Timezone primitives. No date library: the two-pass offset technique below
// is the standard way to convert a wall time in a zone to a UTC instant with
// nothing but Intl. Kept small and private; nothing outside this file should
// ever do timezone math.

type WallTime = {
  y: number
  m: number // 1-12
  d: number
  hh: number
  mm: number
  weekday: number // 0 = Sunday .. 6 = Saturday
}

const wallCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = wallCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false,
    })
    wallCache.set(tz, f)
  }
  return f
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

// What a UTC instant reads as on a wall clock in the zone.
function wallTimeAt(utcMs: number, tz: string): WallTime {
  const parts = formatterFor(tz).formatToParts(new Date(utcMs))
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '0'
  return {
    y: Number(get('year')),
    m: Number(get('month')),
    d: Number(get('day')),
    // Intl can render midnight as "24" with hour12: false; normalize.
    hh: Number(get('hour')) % 24,
    mm: Number(get('minute')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  }
}

// The zone's UTC offset at an instant, in ms (positive east of Greenwich).
function offsetAt(utcMs: number, tz: string): number {
  const w = wallTimeAt(utcMs, tz)
  return Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm) - Math.floor(utcMs / 60000) * 60000
}

// A wall time in a zone, as a UTC instant. Two passes: guess assuming UTC,
// read the real offset there, correct, and re-check once in case the
// correction crossed a DST transition. A nonexistent time (spring-forward
// gap) lands just after the gap; an ambiguous time (fall-back) resolves to
// one side deterministically. Both are fine for a schedule that fires runs.
function zonedToUtc(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  tz: string
): number {
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const first = guess - offsetAt(guess, tz)
  const second = guess - offsetAt(first, tz)
  return second
}

// Calendar-day index of a wall date, independent of any timezone. Used for
// "days since the anchor" arithmetic, which is calendar counting, not
// duration counting.
function dayIndex(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS)
}

function parseAnchor(anchor: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

// Monday-based week index for a calendar day, so "every 2 weeks" advances at
// the Monday boundary the way a person counting weeks on a calendar does.
function weekIndex(y: number, m: number, d: number): number {
  const idx = dayIndex(y, m, d)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = Sun
  const mondayOffset = (weekday + 6) % 7 // days since Monday
  return Math.floor((idx - mondayOffset) / 7)
}

// ---------------------------------------------------------------------------
// Parsing and validation. parseRule is the one place the stored Json becomes
// a RoutineRule; every caller goes through it, so a malformed row degrades to
// null instead of a crash somewhere deep in the runner.

export function validateRule(rule: RoutineRule): string | null {
  if (!['hour', 'day', 'week', 'month'].includes(rule.freq)) return 'Unknown frequency.'
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 99)
    return 'The interval must be between 1 and 99.'
  if (!Number.isInteger(rule.hour) || rule.hour < 0 || rule.hour > 23)
    return 'The hour must be between 0 and 23.'
  if (!Number.isInteger(rule.minute) || rule.minute < 0 || rule.minute > 59)
    return 'The minute must be between 0 and 59.'
  if (rule.byday !== undefined) {
    if (
      !Array.isArray(rule.byday) ||
      rule.byday.length === 0 ||
      rule.byday.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
    )
      return 'Weekdays must be numbers from 0 (Sunday) to 6 (Saturday).'
  }
  if (rule.monthDay !== undefined && rule.monthDay !== 'last') {
    if (!Number.isInteger(rule.monthDay) || rule.monthDay < 1 || rule.monthDay > 31)
      return 'The day of the month must be 1 to 31, or "last".'
  }
  if (!parseAnchor(rule.anchor)) return 'The start date is not a real date.'
  try {
    formatterFor(rule.tz).format(0)
  } catch {
    return 'That timezone is not recognized.'
  }
  return null
}

export function parseRule(json: Json | null): RoutineRule | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const r = json as Record<string, unknown>
  const rule: RoutineRule = {
    freq: r.freq as RoutineRule['freq'],
    interval: r.interval as number,
    byday: r.byday as number[] | undefined,
    monthDay: r.monthDay as RoutineRule['monthDay'],
    hour: r.hour as number,
    minute: r.minute as number,
    anchor: r.anchor as string,
    tz: r.tz as string,
  }
  if (typeof rule.anchor !== 'string' || typeof rule.tz !== 'string') return null
  return validateRule(rule) === null ? rule : null
}

// ---------------------------------------------------------------------------
// Occurrence computation.

// The next n UTC instants the rule fires at, strictly after `after`.
export function nextOccurrences(
  rule: RoutineRule,
  after: Date,
  n: number
): Date[] {
  const afterMs = after.getTime()
  const anchor = parseAnchor(rule.anchor)
  if (!anchor || n <= 0) return []
  const out: Date[] = []

  if (rule.freq === 'hour') {
    // Elapsed-time stepping from the anchor instant. "Every 4 hours" means
    // four hours apart on a stopwatch, so DST neither adds nor removes a run.
    const start = zonedToUtc(anchor.y, anchor.m, anchor.d, rule.hour, rule.minute, rule.tz)
    const step = rule.interval * HOUR_MS
    let k = afterMs < start ? 0 : Math.floor((afterMs - start) / step) + 1
    while (out.length < n) {
      out.push(new Date(start + k * step))
      k++
    }
    return out
  }

  // Day/week/month walk calendar days in the rule's zone, starting from the
  // day `after` falls on there. Hard cap so a malformed rule can never spin.
  const startWall = wallTimeAt(afterMs, rule.tz)
  let y = startWall.y
  let m = startWall.m
  let d = startWall.d
  const anchorIdx = dayIndex(anchor.y, anchor.m, anchor.d)
  const anchorWeek = weekIndex(anchor.y, anchor.m, anchor.d)
  const anchorMonths = anchor.y * 12 + (anchor.m - 1)
  const defaultWeekday = new Date(Date.UTC(anchor.y, anchor.m - 1, anchor.d)).getUTCDay()

  for (let steps = 0; steps < 1600 && out.length < n; steps++) {
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    let fires = false

    if (rule.freq === 'day') {
      const okInterval = (dayIndex(y, m, d) - anchorIdx) % rule.interval === 0
      const okDay = !rule.byday || rule.byday.includes(weekday)
      fires = okInterval && okDay
    } else if (rule.freq === 'week') {
      const days = rule.byday && rule.byday.length > 0 ? rule.byday : [defaultWeekday]
      const okWeek = (weekIndex(y, m, d) - anchorWeek) % rule.interval === 0
      fires = okWeek && days.includes(weekday)
    } else {
      const months = y * 12 + (m - 1)
      const okMonth = (months - anchorMonths) % rule.interval === 0
      const want = rule.monthDay ?? anchor.d
      const target = want === 'last' ? daysInMonth(y, m) : want
      // A month without the day (say, the 31st) is skipped, never rounded.
      fires = okMonth && d === target && target <= daysInMonth(y, m)
    }

    if (fires) {
      const at = zonedToUtc(y, m, d, rule.hour, rule.minute, rule.tz)
      if (at > afterMs) out.push(new Date(at))
    }

    // Advance one calendar day.
    d++
    if (d > daysInMonth(y, m)) {
      d = 1
      m++
      if (m > 12) {
        m = 1
        y++
      }
    }
  }
  return out
}

// Roughly how many runs a month this rule costs, for the "about N runs a
// month" line on the card. Counted, not derived: the next 30 days of real
// occurrences, which handles weekday filters and skipped months for free.
export function runsPerMonth(rule: RoutineRule, from = new Date()): number {
  if (rule.freq === 'hour') return Math.round((30 * 24) / rule.interval)
  const horizon = from.getTime() + 30 * DAY_MS
  const runs = nextOccurrences(rule, from, 62)
  return runs.filter((r) => r.getTime() <= horizon).length
}

// ---------------------------------------------------------------------------
// Words. One sentence, stated the way a person would say it back.

function timeWord(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour < 12 ? 'am' : 'pm'
  return `${h12}:${String(minute).padStart(2, '0')}${suffix}`
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const WEEKDAYS_ONLY = [1, 2, 3, 4, 5]

function ordinal(d: number): string {
  const rem10 = d % 10
  const rem100 = d % 100
  if (rem10 === 1 && rem100 !== 11) return `${d}st`
  if (rem10 === 2 && rem100 !== 12) return `${d}nd`
  if (rem10 === 3 && rem100 !== 13) return `${d}rd`
  return `${d}th`
}

export function describeRule(rule: RoutineRule): string {
  const at = `at ${timeWord(rule.hour, rule.minute)}`

  if (rule.freq === 'hour') {
    return rule.interval === 1 ? 'Every hour' : `Every ${rule.interval} hours`
  }

  if (rule.freq === 'day') {
    const isWeekdays =
      rule.byday &&
      rule.byday.length === 5 &&
      WEEKDAYS_ONLY.every((d) => rule.byday!.includes(d))
    if (rule.interval === 1 && isWeekdays) return `Every weekday ${at}`
    if (rule.interval === 1) return `Every day ${at}`
    return `Every ${rule.interval} days ${at}`
  }

  if (rule.freq === 'week') {
    const days = (rule.byday ?? []).map((d) => WEEKDAY_NAMES[d])
    // A weekly rule that names no day still runs: it keeps the weekday it
    // started on. Saying "Every week on , at 9:00am" instead of "Every week"
    // was the visible half of that, and the run dates below it already say
    // which day.
    if (days.length === 0) {
      return rule.interval === 1
        ? `Every week ${at}`
        : `Every ${rule.interval} weeks ${at}`
    }
    if (rule.interval === 1 && days.length === 1) return `Every ${days[0]} ${at}`
    if (rule.interval === 1) return `Every week on ${listWords(days)}, ${at}`
    const on = days.length > 0 ? ` on ${listWords(days)}` : ''
    return `Every ${rule.interval} weeks${on}, ${at}`
  }

  const day =
    rule.monthDay === 'last'
      ? 'the last day'
      : `the ${ordinal((rule.monthDay as number) ?? 1)}`
  if (rule.interval === 1) return `Every month on ${day}, ${at}`
  return `Every ${rule.interval} months on ${day}, ${at}`
}

// "Mon 4 Aug, 9:00am" in the rule's own timezone, for run-date lists shown in
// tool results and cards. UI code showing dates in the VIEWER's zone should
// format client-side instead; this is for text the model writes back.
export function formatOccurrence(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const ampm = get('dayPeriod').toLowerCase().replace(/\./g, '')
  return `${get('weekday')} ${get('day')} ${get('month')}, ${get('hour')}:${get('minute')}${ampm}`
}
