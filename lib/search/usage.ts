import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database'

// Count one search against the person who asked for it.
//
// Deliberately NOT part of the turn tally in lib/usage.ts, and the split is the
// point. That tally is written once, at the end, fire-and-forget, with a status.
// This is written once per search, in the moment, and awaited. Three failures
// that separation avoids, all of them ones we would have shipped:
//
//   - a dropped write after the stream closes on Vercel gives away a search we
//     paid for
//   - one conversational turn spans up to six drains, so no single row holds
//     "searches this turn"
//   - a `completed` filter, copied from the run allowance, would let anyone
//     abort a stream and search for free
//
// Service-role, like every other write to a table with no insert policy. The
// increment is a single `on conflict do update` in the database, so two
// searches finishing at once cannot both read 4 and both write 5.
//
// Server-only.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
}

// The first of the current month, UTC, as a date string. The same boundary
// getSearchAllowance reads, written once so the two cannot drift.
export function currentUsageMonth(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
}

// Awaited by the caller, but never throws. A failed count must not turn a
// search that worked into an error the user sees; it is logged loudly instead,
// because a silent failure here is money leaving without a trace.
export async function recordSearch(userId: string): Promise<void> {
  const supabase = serviceClient()
  if (!supabase) return
  const { error } = await supabase.rpc('increment_search_usage', {
    uid: userId,
    at_month: currentUsageMonth(),
  })
  if (error) {
    console.error('increment_search_usage failed:', error.message)
  }
}
