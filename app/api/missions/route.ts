import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'
import { assertAgentInSquad, MISSION_OUTPUT_TYPES } from '@/lib/missions'
import type { MissionOutputType } from '@/lib/types/database'

export async function GET() {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  // Explicit user filter: admins can read everyone's missions via RLS, but
  // the board always shows your own.
  const { data, error: dbError } = await supabase
    .from('missions')
    .select('*, agents(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ missions: data })
}

export async function POST(request: Request) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const body = await request.json().catch(() => null)
  const agentId = typeof body?.agent_id === 'string' ? body.agent_id : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const brief = typeof body?.brief === 'string' ? body.brief.trim() : ''
  const outputType = MISSION_OUTPUT_TYPES.includes(body?.output_type)
    ? (body.output_type as MissionOutputType)
    : null
  const webSearch = body?.web_search === true

  if (!agentId || !title || !brief || !outputType) {
    return NextResponse.json(
      { error: 'agent_id, title, brief, and a valid output_type are required' },
      { status: 400 }
    )
  }

  const squadError = await assertAgentInSquad(supabase, userId, agentId)
  if (squadError) return squadError

  const { data, error: dbError } = await supabase
    .from('missions')
    .insert({
      user_id: userId,
      agent_id: agentId,
      title,
      brief,
      output_type: outputType,
      web_search: webSearch,
    })
    .select('*, agents(name)')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ mission: data }, { status: 201 })
}
