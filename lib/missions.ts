import { NextResponse } from 'next/server'
import type { createClient } from '@/lib/supabase/server'
import type { MissionOutputType } from '@/lib/types/database'

export const MISSION_OUTPUT_TYPES: MissionOutputType[] = [
  'doc',
  'sheet',
  'text',
  'pdf',
]

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// The mission's agent must be active and in the caller's squad. Admins can
// see all agents, so this cannot be left to RLS.
export async function assertAgentInSquad(
  supabase: SupabaseServerClient,
  userId: string,
  agentId: string
): Promise<NextResponse | null> {
  const { data } = await supabase
    .from('user_agents')
    .select('agent_id, is_active, agents!inner(status)')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .eq('agents.status', 'active')
    .maybeSingle()
  if (!data) {
    return NextResponse.json(
      { error: 'That agent is not in your squad' },
      { status: 400 }
    )
  }
  return null
}
