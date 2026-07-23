import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'
import { assertAgentInSquad, MISSION_OUTPUT_TYPES } from '@/lib/missions'
import type { Database, MissionOutputType } from '@/lib/types/database'

// Editing is only allowed while a mission is queued: an in-progress mission
// is already running against the old brief, and a completed one is a record.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { id } = await params

  const { data: mission } = await supabase
    .from('missions')
    .select('id, status, agent_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
  }
  if (mission.status !== 'needs_attention') {
    return NextResponse.json(
      { error: 'Only queued missions can be edited' },
      { status: 409 }
    )
  }

  const body = await request.json().catch(() => null)
  const updates: Database['public']['Tables']['missions']['Update'] = {}

  if (typeof body?.title === 'string' && body.title.trim()) {
    updates.title = body.title.trim()
  }
  if (typeof body?.brief === 'string' && body.brief.trim()) {
    updates.brief = body.brief.trim()
  }
  if (typeof body?.web_search === 'boolean') {
    updates.web_search = body.web_search
  }
  if (body?.output_type !== undefined) {
    if (!MISSION_OUTPUT_TYPES.includes(body.output_type)) {
      return NextResponse.json({ error: 'Invalid output_type' }, { status: 400 })
    }
    updates.output_type = body.output_type as MissionOutputType
  }
  if (body?.agent_id !== undefined) {
    if (typeof body.agent_id !== 'string' || !body.agent_id) {
      return NextResponse.json({ error: 'Invalid agent_id' }, { status: 400 })
    }
    if (body.agent_id !== mission.agent_id) {
      const squadError = await assertAgentInSquad(supabase, userId, body.agent_id)
      if (squadError) return squadError
    }
    updates.agent_id = body.agent_id
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error: dbError } = await supabase
    .from('missions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*, agents(name)')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ mission: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { id } = await params

  const { data: mission } = await supabase
    .from('missions')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
  }
  if (mission.status === 'in_progress') {
    return NextResponse.json(
      { error: 'A running mission cannot be deleted' },
      { status: 409 }
    )
  }

  const { error: dbError } = await supabase
    .from('missions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
