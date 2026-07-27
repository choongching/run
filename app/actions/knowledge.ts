'use server'

import { revalidatePath } from 'next/cache'

import { recomposeAgentPrompt } from '@/lib/agents/recompose'
import { getUserProfile } from '@/lib/auth'
import {
  attachRefusal,
  MAX_LIBRARY_SOURCES,
  trimToSourceCap,
} from '@/lib/knowledge/limits'
import { scanForSecrets, sensitiveWarning } from '@/lib/knowledge/sensitive'
import {
  agentKnowledgeLoad,
  checksumOf,
  libraryIsFull,
} from '@/lib/knowledge/store'
import { createClient } from '@/lib/supabase/server'

// What a knowledge mutation tells the UI. `confirm` is the one interesting
// case: the text saved fine as far as the rules go, but it looks like it holds
// a credential, so we hand the decision back instead of quietly storing it.
export type KnowledgeResult =
  | { ok: true }
  | { ok: false; reason: string }
  | { ok: false; confirm: true; reason: string }

// Create a source from typed text and attach it to this agent.
export async function addKnowledgeNote(
  agentId: string,
  input: { title: string; content: string; confirmed?: boolean }
): Promise<KnowledgeResult> {
  const title = input.title.trim().replace(/\s+/g, ' ').slice(0, 120)
  const { text, chars, truncated } = trimToSourceCap(input.content)
  if (!title) return { ok: false, reason: 'Give this a name so you can find it later.' }
  if (!text) return { ok: false, reason: 'There is nothing to save yet.' }

  const findings = scanForSecrets(text)
  if (findings.length > 0 && !input.confirmed) {
    return { ok: false, confirm: true, reason: sensitiveWarning(findings) }
  }

  const { userId } = await getUserProfile()
  const supabase = await createClient()

  if (await libraryIsFull(supabase, userId)) {
    return {
      ok: false,
      reason: `Your library is full at ${MAX_LIBRARY_SOURCES} sources. Delete one to add another.`,
    }
  }

  const load = await agentKnowledgeLoad(supabase, agentId)
  const refusal = attachRefusal({
    attachedChars: load.chars,
    attachedCount: load.count,
    incomingChars: chars,
  })
  if (refusal) return { ok: false, reason: refusal }

  const { data: source, error } = await supabase
    .from('knowledge_sources')
    .insert({
      owner_id: userId,
      title,
      kind: 'note',
      content: text,
      char_count: chars,
      checksum: checksumOf(text),
      origin: truncated ? { truncated: true } : null,
    })
    .select('id')
    .single()
  if (error || !source) {
    return { ok: false, reason: "We couldn't save that. Please try again." }
  }

  return attachAndRecompose(agentId, source.id)
}

// Attach a source the user already has to another of their agents. This is the
// point of a library rather than per-agent copies: one voice guide, many agents.
export async function attachKnowledge(
  agentId: string,
  sourceId: string
): Promise<KnowledgeResult> {
  const supabase = await createClient()
  const { data: source } = await supabase
    .from('knowledge_sources')
    .select('char_count')
    .eq('id', sourceId)
    .single()
  if (!source) return { ok: false, reason: 'That source is no longer available.' }

  const load = await agentKnowledgeLoad(supabase, agentId)
  const refusal = attachRefusal({
    attachedChars: load.chars,
    attachedCount: load.count,
    incomingChars: source.char_count,
  })
  if (refusal) return { ok: false, reason: refusal }

  return attachAndRecompose(agentId, sourceId)
}

// Link, then rebuild the prompt. RLS is the real gate on both: the link policy
// requires that the caller owns the agent AND owns the source.
async function attachAndRecompose(
  agentId: string,
  sourceId: string
): Promise<KnowledgeResult> {
  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const { error } = await supabase
    .from('agent_knowledge')
    .insert({ agent_id: agentId, source_id: sourceId })
  if (error) {
    // The unique constraint means it is already attached, which is not a
    // failure worth showing.
    if (!error.message.includes('duplicate')) {
      return { ok: false, reason: "We couldn't attach that. Please try again." }
    }
  }

  await recomposeAgentPrompt(supabase, agentId, userId)
  revalidatePath(`/chat/${agentId}`)
  revalidatePath('/knowledge')
  return { ok: true }
}

// Stop this agent using a source. The source stays in the library for other
// agents, which is why this is worded as detach, not delete.
export async function detachKnowledge(
  agentId: string,
  sourceId: string
): Promise<KnowledgeResult> {
  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const { error } = await supabase
    .from('agent_knowledge')
    .delete()
    .eq('agent_id', agentId)
    .eq('source_id', sourceId)
  if (error) return { ok: false, reason: "We couldn't detach that. Please try again." }

  await recomposeAgentPrompt(supabase, agentId, userId)
  revalidatePath(`/chat/${agentId}`)
  revalidatePath('/knowledge')
  return { ok: true }
}

// Remove a source from the library entirely. Links cascade in the database, so
// every agent that used it has to be recomposed, not just the one on screen.
export async function deleteKnowledgeSource(
  sourceId: string
): Promise<KnowledgeResult> {
  const { userId } = await getUserProfile()
  const supabase = await createClient()

  // Capture the affected agents before the cascade removes the links.
  const { data: links } = await supabase
    .from('agent_knowledge')
    .select('agent_id')
    .eq('source_id', sourceId)
  const agentIds = [...new Set((links ?? []).map((l) => l.agent_id))]

  const { error } = await supabase
    .from('knowledge_sources')
    .delete()
    .eq('id', sourceId)
    .eq('owner_id', userId)
  if (error) return { ok: false, reason: "We couldn't delete that. Please try again." }

  for (const id of agentIds) {
    await recomposeAgentPrompt(supabase, id, userId)
    revalidatePath(`/chat/${id}`)
  }
  return { ok: true }
}

// Rename a source in the library. The title is what the agent sees as the
// source's heading in its prompt, so it is worth being able to fix.
export async function renameKnowledgeSource(
  sourceId: string,
  rawTitle: string
): Promise<KnowledgeResult> {
  const title = rawTitle.trim().replace(/\s+/g, ' ').slice(0, 120)
  if (!title) return { ok: false, reason: 'Give this a name.' }

  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const { data: links } = await supabase
    .from('agent_knowledge')
    .select('agent_id')
    .eq('source_id', sourceId)

  const { error } = await supabase
    .from('knowledge_sources')
    .update({ title })
    .eq('id', sourceId)
    .eq('owner_id', userId)
  if (error) return { ok: false, reason: "We couldn't rename that. Please try again." }

  for (const id of [...new Set((links ?? []).map((l) => l.agent_id))]) {
    await recomposeAgentPrompt(supabase, id, userId)
    revalidatePath(`/chat/${id}`)
  }
  revalidatePath('/knowledge')
  return { ok: true }
}
