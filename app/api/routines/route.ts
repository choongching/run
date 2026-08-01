import { requireUser } from '@/lib/api-helpers'
import { createRoutine, type NewRoutine } from '@/lib/routines/create'
import { describeRule, formatOccurrence, parseRule, runsPerMonth } from '@/lib/routines/rule'

// The Routines list: every routine the person owns, with its agent's name and
// its most recent run, in one query. The sentence and the cost estimate are
// computed here rather than stored, so an edited rule can never disagree with
// its own description.
export async function GET() {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const { data } = await supabase
    .from('routines')
    .select(
      'id, agent_id, name, instruction, rule, status, next_run_at, last_run_at, consecutive_failures, carry, created_at, agents(name), routine_runs(status, headline, error, started_at, finished_at)'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('started_at', { referencedTable: 'routine_runs', ascending: false })
    .limit(5, { referencedTable: 'routine_runs' })

  const routines = (data ?? []).map((r) => {
    const rule = parseRule(r.rule)
    return {
      id: r.id,
      agentId: r.agent_id,
      agentName: r.agents?.name ?? 'Deleted agent',
      name: r.name,
      instruction: r.instruction,
      rule,
      sentence: rule ? describeRule(rule) : 'Broken schedule',
      perMonth: rule ? runsPerMonth(rule) : 0,
      status: r.status,
      nextRunAt: r.next_run_at,
      lastRunAt: r.last_run_at,
      consecutiveFailures: r.consecutive_failures,
      carry: r.carry,
      runs: r.routine_runs ?? [],
    }
  })

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
