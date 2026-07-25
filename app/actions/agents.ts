'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  buildAgentToolset,
  DEFAULT_AGENT_MODEL,
  MANAGED_AGENTS_BETA,
  getAnthropicClient,
} from '@/lib/anthropic/client'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

// Turn a first prompt into a short agent name. Phase 1 uses a plain heuristic;
// Phase 2 replaces this with the agent naming itself from the conversation.
function deriveAgentName(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, ' ')
  if (!cleaned) return 'New agent'
  const words = cleaned.split(' ').slice(0, 8).join(' ')
  const trimmed = words.length > 48 ? `${words.slice(0, 48)}...` : words
  const stripped = trimmed.replace(/[.,;:!?]+$/, '')
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

// The heart of the prompt-first home: one prompt becomes an agent you can
// talk to. Creates the agent (Anthropic + Supabase dual-write, mirroring
// POST /api/agents), opens its thread, and drops the user into the chat.
export async function startAgentFromPrompt(formData: FormData) {
  const prompt = String(formData.get('prompt') ?? '').trim()
  if (!prompt) redirect('/')

  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const name = deriveAgentName(prompt)
  // The prompt seeds the agent's instructions; the agent refines these
  // through conversation (Phase 2) or the config panel (Phase 4).
  const systemPrompt = prompt
  const enabledTools = { web_search: false, drive: true }

  let claudeAgentId: string
  let claudeVersion: number
  try {
    const anthropic = getAnthropicClient()
    const claudeAgent = await anthropic.beta.agents.create({
      name,
      model: DEFAULT_AGENT_MODEL,
      description: prompt.slice(0, 280),
      system: systemPrompt,
      tools: buildAgentToolset(enabledTools),
      betas: [MANAGED_AGENTS_BETA],
    })
    claudeAgentId = claudeAgent.id
    claudeVersion = claudeAgent.version
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not create the agent'
    redirect(`/?error=${encodeURIComponent(message)}`)
  }

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .insert({
      claude_agent_id: claudeAgentId,
      claude_version: claudeVersion,
      synced_at: new Date().toISOString(),
      name,
      description: prompt.slice(0, 280),
      system_prompt: systemPrompt,
      model: DEFAULT_AGENT_MODEL,
      status: 'active',
      enabled_tools: enabledTools,
      owner_id: userId,
    })
    .select('id')
    .single()

  if (agentError || !agent) {
    redirect(
      `/?error=${encodeURIComponent(agentError?.message ?? 'Could not save the agent')}`
    )
  }

  // One thread per user per agent (v1). Ready for the first message in Phase 2.
  const { error: threadError } = await supabase
    .from('threads')
    .insert({ agent_id: agent.id, user_id: userId })

  if (threadError) {
    redirect(`/?error=${encodeURIComponent(threadError.message)}`)
  }

  // The sidebar agent list lives in the persisted (dashboard) layout, which
  // soft navigation would not refresh; revalidate so the new agent shows.
  revalidatePath('/', 'layout')
  redirect(`/chat/${agent.id}`)
}
