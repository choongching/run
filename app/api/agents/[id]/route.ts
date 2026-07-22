import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import {
  AGENT_TOOLSET,
  MANAGED_AGENTS_BETA,
  getAnthropicClient,
} from '@/lib/anthropic/client'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error
  const { id } = await params

  const { data: existing } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()
  if (!existing) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const name =
    typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : existing.name
  const description =
    body?.description === undefined
      ? existing.description
      : typeof body.description === 'string'
        ? body.description.trim() || null
        : null
  const systemPrompt =
    body?.system_prompt === undefined
      ? existing.system_prompt
      : typeof body.system_prompt === 'string'
        ? body.system_prompt.trim() || null
        : null
  const model = typeof body?.model === 'string' && body.model ? body.model : existing.model

  // Dual-write. The Anthropic update API needs the agent's current version
  // (optimistic concurrency). Use the stored version when we have it; on a
  // mismatch (drift from an out-of-band edit) retrieve and retry once. Always
  // resend the toolset so agents created before it was added get backfilled.
  let newClaudeVersion: number | null = existing.claude_version
  if (existing.claude_agent_id) {
    try {
      const anthropic = getAnthropicClient()
      const updateParams = {
        name,
        model,
        description,
        system: systemPrompt,
        tools: AGENT_TOOLSET,
        betas: [MANAGED_AGENTS_BETA],
      }
      let version = existing.claude_version
      if (version == null) {
        const current = await anthropic.beta.agents.retrieve(existing.claude_agent_id, {
          betas: [MANAGED_AGENTS_BETA],
        })
        version = current.version
      }
      let updated
      try {
        updated = await anthropic.beta.agents.update(existing.claude_agent_id, {
          version,
          ...updateParams,
        })
      } catch {
        const current = await anthropic.beta.agents.retrieve(existing.claude_agent_id, {
          betas: [MANAGED_AGENTS_BETA],
        })
        updated = await anthropic.beta.agents.update(existing.claude_agent_id, {
          version: current.version,
          ...updateParams,
        })
      }
      newClaudeVersion = updated.version
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claude agent update failed'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  const { data: agent, error: dbError } = await supabase
    .from('agents')
    .update({
      name,
      description,
      system_prompt: systemPrompt,
      model,
      claude_version: newClaudeVersion,
      synced_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ agent })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error
  const { id } = await params

  const { data: existing } = await supabase
    .from('agents')
    .select('id, claude_agent_id, status')
    .eq('id', id)
    .single()
  if (!existing) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Soft delete locally, archive on Anthropic. Archive failures are tolerated:
  // the local status is what hides the agent from users.
  if (existing.claude_agent_id) {
    try {
      const anthropic = getAnthropicClient()
      await anthropic.beta.agents.archive(existing.claude_agent_id, {
        betas: [MANAGED_AGENTS_BETA],
      })
    } catch {
      // Archived-already or transient API failure; local soft delete proceeds.
    }
  }

  const { error: dbError } = await supabase
    .from('agents')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
