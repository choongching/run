import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'

// Personal knob on a squad assignment: the user's own standing instructions
// for one agent, folded into every mission kickoff.

export async function PATCH(request: Request) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const body = await request.json().catch(() => null)
  const agentId = typeof body?.agent_id === 'string' ? body.agent_id : ''
  if (!agentId || typeof body?.custom_instructions !== 'string') {
    return NextResponse.json(
      { error: 'agent_id and custom_instructions are required' },
      { status: 400 }
    )
  }

  const instructions = body.custom_instructions.trim()

  const { data, error: dbError } = await supabase
    .from('user_agents')
    .update({ custom_instructions: instructions || null })
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .select('agent_id, custom_instructions')
    .maybeSingle()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json(
      { error: 'That agent is not in your squad' },
      { status: 404 }
    )
  }
  return NextResponse.json({ squad: data })
}
