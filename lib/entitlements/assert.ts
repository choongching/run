import type { SupabaseClient } from '@supabase/supabase-js'

import {
  agentLimitReason,
  planFor,
  runLimitReason,
  searchLimitReason,
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

  // Counted straight off the table rather than read from usage_monthly, and
  // the difference is not cosmetic. The view groups by date_trunc('month'),
  // and a filter on a computed column cannot use an index, so reading it costs
  // a scan of everything the person has ever done. This runs in the layout, on
  // every route, so that scan would grow with their whole history forever. A
  // plain range on created_at is the same answer from an index.
  //
  // head: true asks for the count without the rows.
  const { count } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'mission_run')
    .eq('status', 'completed')
    .gte('created_at', start.toISOString())

  const resetsAt = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
  ).toISOString()

  return { used: count ?? 0, limit: limits.runsPerMonth, resetsAt }
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


// Web searches used this month, on our provider key only.
//
// Read from the search_usage rollup rather than counted off usage_events, and
// the difference is not an optimisation. usage_events is written once per turn,
// fire-and-forget, with a status; search_usage is written once per search, in
// the moment, awaited. Three ways the first is wrong for this: a dropped write
// after the stream closes, a turn spanning several drains, and a `completed`
// filter anyone could dodge by aborting. Migration 039 states the reasoning.
//
// The read is one primary-key lookup. A missing row means nobody has searched
// yet this month, which is zero rather than an error.
export type SearchAllowance = {
  used: number
  limit: number
  resetsAt: string
}

export async function getSearchAllowance(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId?: string | null
): Promise<SearchAllowance> {
  const { limits } = planFor(planId)
  const start = monthStart()
  const month = start.toISOString().slice(0, 10)

  const { data } = await supabase
    .from('search_usage')
    .select('searches')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()

  const resetsAt = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
  ).toISOString()

  return {
    used: data?.searches ?? 0,
    limit: limits.searchesPerMonth,
    resetsAt,
  }
}

// Checked before every search that would run on our key. A search on someone's
// own connected account never reaches this: it is not our bill, so it is not
// ours to cap.
export async function canSearch(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId?: string | null
): Promise<Allowance> {
  const { used, limit } = await getSearchAllowance(supabase, userId, planId)
  if (used >= limit) {
    return { ok: false, reason: searchLimitReason(limit) }
  }
  return { ok: true }
}
