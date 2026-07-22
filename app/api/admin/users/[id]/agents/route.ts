import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error
  const { id: userId } = await params

  const body = await request.json().catch(() => null)
  const agentId = typeof body?.agent_id === 'string' ? body.agent_id : ''
  if (!agentId) {
    return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
  }

  const { data, error: dbError } = await supabase
    .from('user_agents')
    .upsert(
      { user_id: userId, agent_id: agentId, is_active: true },
      { onConflict: 'user_id,agent_id' }
    )
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ user_agent: data }, { status: 201 })
}
