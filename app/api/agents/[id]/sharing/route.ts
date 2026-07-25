import { NextResponse } from 'next/server'
import { requireAgentEditor } from '@/lib/api-helpers'

// Owner-scoped sharing controls: who can see and run this agent. Visibility
// writes agents.visibility; person rows write user_agents (the sharing ACL).
// RLS backs every write: owners manage rows for their own agents, admins for
// all. Until now only admin assignment routes existed.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAgentEditor(id)
  if (error) return error

  const body = await request.json().catch(() => null)
  if (body?.visibility !== 'private' && body?.visibility !== 'company') {
    return NextResponse.json(
      { error: 'visibility must be private or company' },
      { status: 400 }
    )
  }

  const { data: agent, error: dbError } = await supabase
    .from('agents')
    .update({ visibility: body.visibility })
    .eq('id', id)
    .select('id, visibility')
    .single()
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ agent })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAgentEditor(id)
  if (error) return error

  const body = await request.json().catch(() => null)
  const targetUserId = typeof body?.user_id === 'string' ? body.user_id : ''
  if (!targetUserId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  // Upsert so re-sharing after a remove (or after the person deactivated the
  // row themselves) reactivates rather than failing the unique constraint.
  const { error: dbError } = await supabase
    .from('user_agents')
    .upsert(
      { user_id: targetUserId, agent_id: id, is_active: true },
      { onConflict: 'user_id,agent_id' }
    )
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAgentEditor(id)
  if (error) return error

  const url = new URL(request.url)
  const targetUserId = url.searchParams.get('user_id') ?? ''
  if (!targetUserId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  // Deactivate rather than delete: the row may carry the person's notes
  // (custom_instructions), which they keep if the agent is shared again.
  const { error: dbError } = await supabase
    .from('user_agents')
    .update({ is_active: false })
    .eq('agent_id', id)
    .eq('user_id', targetUserId)
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
