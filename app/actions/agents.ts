'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  AGENT_MODELS,
  buildAgentToolset,
  DEFAULT_AGENT_MODEL,
  MANAGED_AGENTS_BETA,
  NAMING_MODEL,
  getAnthropicClient,
} from '@/lib/anthropic/client'
import { getUserProfile } from '@/lib/auth'
import { buildSystemPrompt, parseSetupAnswers } from '@/lib/chat/onboarding'
import { createClient } from '@/lib/supabase/server'

// Fallback name when the model naming call is unavailable: a short slice of the
// prompt so an agent is never left unnamed.
function deriveAgentName(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, ' ')
  if (!cleaned) return 'New agent'
  const words = cleaned.split(' ').slice(0, 6).join(' ')
  const trimmed = words.length > 40 ? `${words.slice(0, 40)}...` : words
  const stripped = trimmed.replace(/[.,;:!?]+$/, '')
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

// Name a new agent from its first prompt with a quick, cheap model call. Falls
// back to the prompt slice if the call fails, so creation never blocks on it.
async function generateAgentName(prompt: string): Promise<string> {
  try {
    const anthropic = getAnthropicClient()
    const res = await anthropic.messages.create({
      model: NAMING_MODEL,
      max_tokens: 20,
      system:
        'You name AI agents. Given what an agent should do, reply with a short, human name of 2 to 4 words in Title Case that captures its job. Reply with only the name: no quotes, no punctuation, no preamble.',
      messages: [{ role: 'user', content: prompt.slice(0, 500) }],
    })
    const block = res.content.find((b) => b.type === 'text')
    const raw = block && block.type === 'text' ? block.text : ''
    const name = raw
      .trim()
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/[.]+$/, '')
      .replace(/\s+/g, ' ')
      .slice(0, 48)
    return name || deriveAgentName(prompt)
  } catch {
    return deriveAgentName(prompt)
  }
}

// The heart of the prompt-first home: one prompt becomes an agent you can
// talk to. Creates the agent (Anthropic + Supabase dual-write, mirroring
// POST /api/agents), opens its thread, and drops the user into the chat.
export async function startAgentFromPrompt(formData: FormData) {
  const prompt = String(formData.get('prompt') ?? '').trim()
  if (!prompt) redirect('/')

  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const name = await generateAgentName(prompt)
  // The prompt seeds the agent's instructions; the agent refines these
  // through conversation (Phase 2) or the config panel (Phase 4).
  // buildSystemPrompt folds in the always-on role boundary from creation so a
  // brand-new agent stays in its lane even before onboarding runs.
  const systemPrompt = buildSystemPrompt(prompt, [])
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

// Rename an agent from the chat header. Our database name drives every surface
// (sidebar, header, thread); the Anthropic console name is synced best-effort
// so a version conflict or API hiccup never blocks the rename the user sees.
export async function renameAgent(agentId: string, rawName: string) {
  const name = rawName.trim().replace(/\s+/g, ' ').slice(0, 60)
  if (!name) return

  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const { data: agent, error } = await supabase
    .from('agents')
    .update({ name })
    .eq('id', agentId)
    .eq('owner_id', userId)
    .select('claude_agent_id, claude_version')
    .single()

  if (error || !agent) return

  if (agent.claude_agent_id && agent.claude_version != null) {
    try {
      const anthropic = getAnthropicClient()
      const updated = await anthropic.beta.agents.update(agent.claude_agent_id, {
        version: agent.claude_version,
        name,
        betas: [MANAGED_AGENTS_BETA],
      })
      await supabase
        .from('agents')
        .update({ claude_version: updated.version, synced_at: new Date().toISOString() })
        .eq('id', agentId)
    } catch {
      // Cosmetic sync only. The database name is the source of truth for the UI.
    }
  }

  revalidatePath('/', 'layout')
  revalidatePath(`/chat/${agentId}`)
}

// Save the agent's config from the chat side panel: its name and its base
// instructions. The instructions recombine with the saved setup preferences so
// editing here never drops what onboarding captured. The database is the source
// of truth for every surface; the Anthropic agent (name + system) is synced
// best-effort so a version conflict or API hiccup never blocks the save.
export async function updateAgentConfig(
  agentId: string,
  input: { name: string; instructions: string; model: string }
): Promise<void> {
  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 60)
  const baseInstructions = input.instructions.trim()
  // Only accept a model we actually offer; anything else leaves it unchanged.
  const model = AGENT_MODELS.some((m) => m.id === input.model)
    ? input.model
    : undefined
  if (!name) return

  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('agents')
    .select('preferences')
    .eq('id', agentId)
    .eq('owner_id', userId)
    .single()
  if (!current) return

  const answers = parseSetupAnswers(current.preferences)
  const system = buildSystemPrompt(baseInstructions, answers)

  const { data: agent, error } = await supabase
    .from('agents')
    .update({ name, system_prompt: system, ...(model ? { model } : {}) })
    .eq('id', agentId)
    .eq('owner_id', userId)
    .select('claude_agent_id, claude_version')
    .single()

  if (error || !agent) return

  if (agent.claude_agent_id && agent.claude_version != null) {
    try {
      const anthropic = getAnthropicClient()
      const updated = await anthropic.beta.agents.update(agent.claude_agent_id, {
        version: agent.claude_version,
        name,
        system,
        ...(model ? { model } : {}),
        betas: [MANAGED_AGENTS_BETA],
      })
      await supabase
        .from('agents')
        .update({ claude_version: updated.version, synced_at: new Date().toISOString() })
        .eq('id', agentId)
    } catch {
      // Cosmetic sync only. The database is the source of truth for the UI and
      // for building the next session.
    }
  }

  revalidatePath('/', 'layout')
  revalidatePath(`/chat/${agentId}`)
}
