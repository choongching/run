import { requireUser } from '@/lib/api-helpers'
import { runRoutine } from '@/lib/routines/execute'

// Run a routine right now. This is how a routine earns trust: you try it
// before you rely on it, and the result lands in the chat exactly as a
// scheduled run's would. Counts against the allowance like any other run.
export const maxDuration = 300

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { routineId } = await params

  // Ownership through the caller's own RLS-scoped client; the executor runs
  // under the service role, so the check has to happen out here.
  const { data: routine } = await supabase
    .from('routines')
    .select('id')
    .eq('id', routineId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!routine) {
    return Response.json({ error: 'That routine is not here any more.' }, { status: 404 })
  }

  const outcome = await runRoutine(routineId, { trigger: 'manual' })
  if (!outcome.ok) {
    return Response.json({ error: outcome.reason }, { status: 400 })
  }
  return Response.json({ ok: true, headline: outcome.headline })
}
