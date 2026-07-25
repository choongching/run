import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Agent } from '@/lib/types/database'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type AdminCheck =
  | { error: NextResponse; supabase: null; userId: null }
  | { error: null; supabase: SupabaseServerClient; userId: string }

// Any signed-in user (missions are per-user; RLS scopes the queries).
export async function requireUser(): Promise<AdminCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      supabase: null,
      userId: null,
    }
  }
  return { error: null, supabase, userId: user.id }
}

// Route handlers must enforce authorization themselves, never rely on the
// dashboard shell having done it.
export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      supabase: null,
      userId: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      supabase: null,
      userId: null,
    }
  }

  return { error: null, supabase, userId: user.id }
}

type AgentEditorCheck =
  | { error: NextResponse; supabase: null; userId: null; agent: null }
  | {
      error: null
      supabase: SupabaseServerClient
      userId: string
      agent: Agent
    }

// Editing an agent is an ownership right, not a role right: the owner or a
// company admin. The agent fetch runs under the caller's RLS, so an agent
// they cannot even see reads as not found rather than forbidden.
export async function requireAgentEditor(
  agentId: string
): Promise<AgentEditorCheck> {
  const base = await requireUser()
  if (base.error) {
    return { error: base.error, supabase: null, userId: null, agent: null }
  }
  const { supabase, userId } = base

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .maybeSingle()
  if (!agent) {
    return {
      error: NextResponse.json({ error: 'Agent not found' }, { status: 404 }),
      supabase: null,
      userId: null,
      agent: null,
    }
  }

  if (agent.owner_id !== userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (profile?.role !== 'admin') {
      return {
        error: NextResponse.json(
          { error: 'Only the agent’s owner can change it' },
          { status: 403 }
        ),
        supabase: null,
        userId: null,
        agent: null,
      }
    }
  }

  return { error: null, supabase, userId, agent }
}
