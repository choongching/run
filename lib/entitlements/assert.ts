import type { SupabaseClient } from '@supabase/supabase-js'

import { agentLimitReason, planFor } from '@/lib/entitlements/plans'
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
