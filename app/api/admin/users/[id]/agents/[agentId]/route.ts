import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error
  const { id: userId, agentId } = await params

  const { error: dbError } = await supabase
    .from('user_agents')
    .delete()
    .eq('user_id', userId)
    .eq('agent_id', agentId)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
