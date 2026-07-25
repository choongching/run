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

// The mission's agent must be active and visible to the caller: owned by
// them, company-visible, or shared to them. Agents RLS encodes exactly that
// audience rule, so a scoped select IS the authorization check.
export async function assertAgentRunnable(
  supabase: SupabaseServerClient,
  agentId: string
): Promise<NextResponse | null> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('status', 'active')
    .maybeSingle()
  if (!data) {
    return NextResponse.json(
      { error: 'That agent is not available to you' },
      { status: 400 }
    )
  }
  return null
}
