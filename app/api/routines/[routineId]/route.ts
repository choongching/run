import { requireUser } from '@/lib/api-helpers'
import { nextOccurrences, parseRule } from '@/lib/routines/rule'
import type { Database, Json } from '@/lib/types/database'

type RoutinePatch = Database['public']['Tables']['routines']['Update']

// Change one routine: pause, resume, rename, rewrite the instruction, change
// the schedule, or clear what it remembers. RLS scopes every statement to the owner, so a
// wrong id is a silent zero-row update and a 404 here.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { routineId } = await params

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Nothing to change.' }, { status: 400 })

  const patch: RoutinePatch = {}

  if (body.action === 'pause') {
    patch.status = 'paused'
  } else if (body.action === 'resume') {
    // Resuming recomputes the next run from NOW. Without this, a routine
    // paused for a month would fire the moment it woke, on a date that made
    // sense back when it went to sleep.
    const { data: current } = await supabase
      .from('routines')
      .select('rule')
      .eq('id', routineId)
      .eq('user_id', userId)
      .maybeSingle()
    const rule = parseRule(current?.rule ?? null)
    if (!rule) {
      return Response.json({ error: 'That routine has a broken schedule.' }, { status: 400 })
    }
    patch.status = 'active'
    patch.consecutive_failures = 0
    patch.next_run_at = nextOccurrences(rule, new Date(), 1)[0]?.toISOString() ?? null
  }

  // A new schedule. parseRule is the gate (it validates and returns null on
  // anything malformed), and next_run_at MUST move with it: leaving the old
  // instant behind would fire the routine once more on the schedule the
  // person just replaced.
  //
  // A run claimed by the tick between this read and this write is not at
  // risk. The tick's compare-and-swap requires next_run_at to be unchanged,
  // so an edit landing mid-claim makes that claim fail: a skipped run, never
  // a doubled one.
  if (body.rule !== undefined) {
    const rule = parseRule(body.rule)
    if (!rule) {
      return Response.json(
        { error: 'That schedule is not one Run can follow.' },
        { status: 400 }
      )
    }
    const next = nextOccurrences(rule, new Date(), 1)[0]
    if (!next) {
      return Response.json({ error: 'That schedule never fires.' }, { status: 400 })
    }
    patch.rule = rule as unknown as Json
    patch.next_run_at = next.toISOString()
  }

  if (typeof body.name === 'string' && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 80)
  }
  if (typeof body.instruction === 'string' && body.instruction.trim()) {
    patch.instruction = body.instruction.trim().slice(0, 4000)
  }
  if (body.clearCarry === true) patch.carry = null

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'Nothing to change.' }, { status: 400 })
  }

  const { data } = await supabase
    .from('routines')
    .update(patch)
    .eq('id', routineId)
    .eq('user_id', userId)
    .select('id, status, next_run_at')
    .maybeSingle()

  if (!data) {
    return Response.json({ error: 'That routine is not here any more.' }, { status: 404 })
  }
  return Response.json({ routine: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { routineId } = await params

  await supabase.from('routines').delete().eq('id', routineId).eq('user_id', userId)
  return Response.json({ ok: true })
}
