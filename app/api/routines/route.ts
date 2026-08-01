import { requireUser } from '@/lib/api-helpers'
import { createRoutine, type NewRoutine } from '@/lib/routines/create'
import { listRoutines } from '@/lib/routines/list'
import { describeRule, formatOccurrence, parseRule } from '@/lib/routines/rule'

// The Routines list: every routine the person owns, with its agent's name and
// its recent runs, in one query. Shared with the Routines page via
// lib/routines/list.ts so the two can never drift.
export async function GET() {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const routines = await listRoutines(supabase, userId)
  return Response.json({ routines })
}

// Create a routine directly (the Configure panel and the Routines page use
// this; chat creation goes through the approve route instead, because there
// the routine is a pending tool call).
export async function POST(request: Request) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const body = (await request.json().catch(() => null)) as
    | (NewRoutine & { tz?: string })
    | null
  if (!body?.agentId || !body?.rule) {
    return Response.json({ error: 'That routine is missing its schedule.' }, { status: 400 })
  }

  const result = await createRoutine(supabase, userId, {
    agentId: body.agentId,
    name: body.name,
    instruction: body.instruction,
    rule: body.rule,
    tz: body.tz ?? 'UTC',
  })
  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 })
  }

  const rule = parseRule(result.routine.rule)!
  return Response.json({
    routine: result.routine,
    sentence: describeRule(rule),
    firstRuns: result.firstRuns.map((d) => formatOccurrence(d, rule.tz)),
  })
}
