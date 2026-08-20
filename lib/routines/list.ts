import type { SupabaseClient } from '@supabase/supabase-js'

import {
  describeRule,
  parseRule,
  runsPerMonth,
  type RoutineRule,
} from '@/lib/routines/rule'
import type { Database, RoutineRunStatus, RoutineStatus } from '@/lib/types/database'

// A routine as every list surface shows it: the row plus its sentence, its
// cost, and its recent runs. Computed here, not stored, so an edited rule can
// never disagree with its own description.
export type RoutineListItem = {
  id: string
  agentId: string
  agentName: string
  name: string
  instruction: string
  rule: RoutineRule | null
  sentence: string
  perMonth: number
  status: RoutineStatus
  nextRunAt: string | null
  lastRunAt: string | null
  consecutiveFailures: number
  carry: string | null
  deliverTelegram: boolean
  createdAt: string
  runs: {
    status: RoutineRunStatus
    headline: string | null
    error: string | null
    startedAt: string
    finishedAt: string | null
  }[]
}

// Three failures in a row is a broken connector, not bad luck. The list and
// the sidebar badge both draw the line here.
export const FAILING_AFTER = 3

export function needsAttention(r: {
  status: RoutineStatus
  consecutiveFailures: number
}): boolean {
  return r.status === 'paused_system' || r.consecutiveFailures >= FAILING_AFTER
}

export async function listRoutines(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<RoutineListItem[]> {
  const { data } = await supabase
    .from('routines')
    .select(
      'id, agent_id, name, instruction, rule, status, next_run_at, last_run_at, consecutive_failures, carry, deliver_telegram, created_at, agents(name), routine_runs(status, headline, error, started_at, finished_at)'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('started_at', { referencedTable: 'routine_runs', ascending: false })
    .limit(5, { referencedTable: 'routine_runs' })

  return (data ?? []).map((r) => {
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
      deliverTelegram: r.deliver_telegram,
      createdAt: r.created_at,
      runs: (r.routine_runs ?? []).map((run) => ({
        status: run.status,
        headline: run.headline,
        error: run.error,
        startedAt: run.started_at,
        finishedAt: run.finished_at,
      })),
    }
  })
}
