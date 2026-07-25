import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-helpers'
import {
  buildAgentToolset,
  DEFAULT_AGENT_MODEL,
  MANAGED_AGENTS_BETA,
  getAnthropicClient,
} from '@/lib/anthropic/client'
import { AGENT_OUTPUT_TYPES, parseEnabledTools } from '@/lib/agents/config'
import type { OutputType } from '@/lib/types/database'

// Building agents is open to every member (phase 7). RLS scopes reads to
// what the caller may see and stamps ownership rules on writes.
export async function GET() {
  const { error, supabase } = await requireUser()
  if (error) return error

  const { data: agents, error: dbError } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ agents })
}

export async function POST(request: Request) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const description =
    typeof body?.description === 'string' ? body.description.trim() || null : null
  const systemPrompt =
    typeof body?.system_prompt === 'string' ? body.system_prompt.trim() || null : null
  const model = typeof body?.model === 'string' && body.model ? body.model : DEFAULT_AGENT_MODEL
  const enabledTools = parseEnabledTools(body?.enabled_tools)
  const guardrails =
    typeof body?.guardrails === 'string' ? body.guardrails.trim() || null : null
  const defaultOutputType = AGENT_OUTPUT_TYPES.includes(body?.default_output_type)
    ? (body.default_output_type as OutputType)
    : null
  // The wizard creates agents as drafts and publishes at the end.
  const status = body?.status === 'draft' ? 'draft' : 'active'

  // Dual-write: Anthropic first so we never store an agent without its
  // claude_agent_id link. Supabase remains the source of truth; the returned
  // version is kept so later updates can skip a retrieve round-trip.
  let claudeAgentId: string
  let claudeVersion: number
  try {
    const anthropic = getAnthropicClient()
    const claudeAgent = await anthropic.beta.agents.create({
      name,
      model,
      description: description ?? undefined,
      system: systemPrompt,
      tools: buildAgentToolset(enabledTools),
      betas: [MANAGED_AGENTS_BETA],
    })
    claudeAgentId = claudeAgent.id
    claudeVersion = claudeAgent.version
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude agent creation failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const { data: agent, error: dbError } = await supabase
    .from('agents')
    .insert({
      claude_agent_id: claudeAgentId,
      claude_version: claudeVersion,
      synced_at: new Date().toISOString(),
      name,
      description,
      system_prompt: systemPrompt,
      model,
      status,
      enabled_tools: enabledTools,
      guardrails,
      default_output_type: defaultOutputType,
      // New agents belong to their creator and start private.
      owner_id: userId,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ agent }, { status: 201 })
}
