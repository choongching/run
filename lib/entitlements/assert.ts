import type { SupabaseClient } from '@supabase/supabase-js'

import {
  agentLimitReason,
  planFor,
  runLimitReason,
} from '@/lib/entitlements/plans'
import type { Database } from '@/lib/types/database'

// The one place a limit is enforced.
//
// Disabled buttons are a courtesy to a human, not a control: anything that can
// be posted can be posted without the UI. So every limit is checked here, on
// the server, before the thing is created, and the UI reads the same helper to
// decide what to disable. If the two ever disagree, the server wins and the
// user gets a sentence explaining why rather than a silent failure.

export type Allowance =
  | { ok: true }
  | { ok: false; reason: string }

// Agents a user currently holds. Archived ones do not count against the cap:
// they cannot be used, so charging for them would be a trap.
export async function countAgents(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .neq('status', 'archived')
  return count ?? 0
}

export async function canCreateAgent(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId?: string | null
): Promise<Allowance> {
  const { limits } = planFor(planId)
  const used = await countAgents(supabase, userId)
  if (used >= limits.agents) {
    return { ok: false, reason: agentLimitReason(limits.agents) }
  }
  return { ok: true }
}

// What a meter needs: used, the limit it is measured against, and when it
// refills. One read of the monthly rollup rather than a scan the caller sums.
//
// The period is the calendar month, so "when does this come back" is a date a
// person can already picture. A row is missing until the first run of a month,
// which reads as zero rather than as an error.
export type RunAllowance = {
  used: number
  limit: number
  resetsAt: string
}

function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export async function getRunAllowance(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId?: string | null
): Promise<RunAllowance> {
  const { limits } = planFor(planId)
  const start = monthStart()
  const { data } = await supabase
    .from('usage_monthly')
    .select('runs')
    .eq('user_id', userId)
    .eq('month', start.toISOString())
    .maybeSingle()

  const resetsAt = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
  ).toISOString()

  return { used: data?.runs ?? 0, limit: limits.runsPerMonth, resetsAt }
}

export async function canRunAgent(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId?: string | null
): Promise<Allowance> {
  const { used, limit } = await getRunAllowance(supabase, userId, planId)
  if (used >= limit) {
    return { ok: false, reason: runLimitReason(limit) }
  }
  return { ok: true }
}
