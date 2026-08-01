import { timingSafeEqual } from 'node:crypto'

import { runRoutine } from '@/lib/routines/execute'
import { nextOccurrences, parseRule } from '@/lib/routines/rule'
import { createServiceClient } from '@/lib/supabase/service'

// The heartbeat. A pg_cron job POSTs here every five minutes; this route
// finds routines that are due and runs them. It is the only route in the app
// with no user behind it, so it authenticates with a shared secret instead
// of a session, and every claim is compare-and-swap so two overlapping ticks
// can never run the same routine twice.
//
// The claim ADVANCES next_run_at before the run happens. That makes firing
// at-most-once: a run that crashes is a skipped run, never a doubled one,
// and for a product that reads inboxes, skipping beats repeating.
export const maxDuration = 300

// Stop claiming with a minute to spare, so a run that starts has room to
// finish inside the platform ceiling. Anything still due is picked up by the
// next tick five minutes later.
const TIME_BUDGET_MS = 240_000
const BATCH = 5

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get('authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '')
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const secret = process.env.ROUTINES_CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'The runner is not configured.' }, { status: 500 })
  }
  if (!authorized(request, secret)) {
    return Response.json({ error: 'Not allowed.' }, { status: 401 })
  }
  const supabase = createServiceClient()
  if (!supabase) {
    return Response.json({ error: 'The runner is not configured.' }, { status: 500 })
  }

  const startedAt = Date.now()
  let ran = 0
  let failed = 0
  let skipped = 0

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const { data: due } = await supabase
      .from('routines')
      .select('id, rule, next_run_at')
      .eq('status', 'active')
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(BATCH)
    if (!due || due.length === 0) break

    let claimedAny = false
    for (const r of due) {
      if (Date.now() - startedAt >= TIME_BUDGET_MS) break

      const rule = parseRule(r.rule)
      const next = rule
        ? (nextOccurrences(rule, new Date(), 1)[0]?.toISOString() ?? null)
        : null

      // The compare-and-swap: advance next_run_at only if it still holds the
      // value we read. Zero rows back means another tick won the race, or
      // the person paused it in the meantime; either way, not ours.
      const { data: claimed } = await supabase
        .from('routines')
        .update({ next_run_at: next })
        .eq('id', r.id)
        .eq('status', 'active')
        .eq('next_run_at', r.next_run_at!)
        .select('id')
      if (!claimed || claimed.length === 0) {
        skipped++
        continue
      }
      claimedAny = true

      // A rule that no longer parses cannot compute a next run; pause it
      // rather than leave a null next_run_at pretending to be a schedule.
      if (!rule) {
        await supabase
          .from('routines')
          .update({ status: 'paused_system' })
          .eq('id', r.id)
        continue
      }

      const outcome = await runRoutine(r.id, { trigger: 'schedule' })
      if (outcome.ok) ran++
      else failed++
    }
    // Nothing in the batch was claimable (all raced away or unparseable):
    // stop rather than spin on the same rows until the budget burns out.
    if (!claimedAny) break
  }

  return Response.json({ ran, failed, skipped })
}
