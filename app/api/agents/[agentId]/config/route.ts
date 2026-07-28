import { NextResponse } from 'next/server'

import { requireUser } from '@/lib/api-helpers'
import { loadPanelExtras } from '@/lib/chat/panel-data'
import { ownsAgent } from '@/lib/knowledge/store'

// Serves the Configure panel's data when the panel opens, rather than making
// every chat load pay for a panel that starts closed.
//
// Ownership is checked explicitly rather than left to RLS. The agent id comes
// from the URL, and while RLS scopes the library to its owner, the attached
// knowledge is looked up by agent id. Asking the same question the panel's own
// actions ask keeps a non-owner from learning what another agent carries.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const { agentId } = await params

  if (!(await ownsAgent(supabase, agentId, userId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const extras = await loadPanelExtras(supabase, agentId, userId)
  return NextResponse.json(extras)
}
