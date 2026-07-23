import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'

// Pinned Drive knowledge files for one agent. PUT replaces the whole set so
// the editor can auto-save its current selection in one call.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error
  const { id } = await params

  const { data: files, error: dbError } = await supabase
    .from('agent_knowledge')
    .select('*')
    .eq('agent_id', id)
    .order('file_name')
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ files: files ?? [] })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error
  const { id } = await params

  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', id)
    .single()
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.files)) {
    return NextResponse.json({ error: 'files array is required' }, { status: 400 })
  }
  // Dedupe by file_id: a duplicate in the payload would trip the
  // unique(agent_id, file_id) constraint and fail the whole replace.
  const byId = new Map<string, { file_id: string; file_name: string; file_mime_type: string }>()
  for (const f of body.files) {
    if (
      typeof f?.file_id !== 'string' ||
      typeof f?.file_name !== 'string' ||
      typeof f?.file_mime_type !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Each file needs file_id, file_name, and file_mime_type' },
        { status: 400 }
      )
    }
    byId.set(f.file_id, {
      file_id: f.file_id,
      file_name: f.file_name,
      file_mime_type: f.file_mime_type,
    })
  }
  const files = [...byId.values()]

  const { error: deleteError } = await supabase
    .from('agent_knowledge')
    .delete()
    .eq('agent_id', id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (files.length > 0) {
    const { error: insertError } = await supabase
      .from('agent_knowledge')
      .insert(files.map((f) => ({ ...f, agent_id: id })))
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  const { data: saved } = await supabase
    .from('agent_knowledge')
    .select('*')
    .eq('agent_id', id)
    .order('file_name')
  return NextResponse.json({ files: saved ?? [] })
}
