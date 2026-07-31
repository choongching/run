import { NextResponse } from 'next/server'

import { requireUser } from '@/lib/api-helpers'
import { getRunAllowance } from '@/lib/entitlements/assert'

// Feeds the little run meter in the chat composer: the month's allowance
// plus how many runs this agent's chat has used this month. Fetched once
// when a chat opens; the sidebar meter stays the live one.
export async function GET(request: Request) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const agentId = new URL(request.url).searchParams.get('agentId')

  const [allowance, { data: thread }] = await Promise.all([
    getRunAllowance(supabase, userId),
    agentId
      ? supabase
          .from('threads')
          .select('id')
          .eq('agent_id', agentId)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  let threadRuns = 0
  if (thread?.id) {
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('thread_id', thread.id)
      .eq('event_type', 'mission_run')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString())
    threadRuns = count ?? 0
  }

  return NextResponse.json({
    used: allowance.used,
    limit: allowance.limit,
    resetsAt: allowance.resetsAt,
    threadRuns,
  })
}
