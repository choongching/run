'use server'

import { revalidatePath } from 'next/cache'

import { recomposeAgentPrompt } from '@/lib/agents/recompose'
import { getUserIdentity } from '@/lib/auth'
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
  NOT_AGENT_OWNER,
  ownedAgentIds,
  ownsAgent,
} from '@/lib/knowledge/store'
import { createClient } from '@/lib/supabase/server'

// What a knowledge mutation tells the UI. `confirm` is the one interesting
// case: the text saved fine as far as the rules go, but it looks like it holds
// a credential, so we hand the decision back instead of quietly storing it.
export type KnowledgeResult =
  | { ok: true }
  | { ok: false; reason: string }
  | { ok: false; confirm: true; reason: string }

// The text of one source, for the details view.
//
// Deliberately not part of the library page's own query: a source runs to
// 20,000 characters and a full library is 50 of them, so shipping every text
// to the client to show one of them would be a megabyte nobody reads. RLS is
// the gate; owner_id is here so a miss reads as "gone" rather than as an
// empty note.
export async function readKnowledgeSource(
  sourceId: string
): Promise<{ ok: true; content: string } | { ok: false; reason: string }> {
  const { userId } = await getUserIdentity()
  const supabase = await createClient()

  const { data } = await supabase
    .from('knowledge_sources')
    .select('content')
    .eq('id', sourceId)
    .eq('owner_id', userId)
    .maybeSingle()

  if (!data) return { ok: false, reason: 'That source is no longer available.' }
  return { ok: true, content: data.content }
}

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

  const { userId } = await getUserIdentity()
  const supabase = await createClient()

  // Before creating anything, so a non-owner never leaves an orphaned source
  // behind in exchange for an error they cannot act on.
  if (!(await ownsAgent(supabase, agentId, userId))) {
    return { ok: false, reason: NOT_AGENT_OWNER }
  }

  if (await libraryIsFull(supabase, userId)) {
    return {
      ok: false,
      reason: `Your library is full at ${MAX_LIBRARY_SOURCES} sources. Delete one to add another.`,
    }
  }

  const load = await agentKnowledgeLoad(supabase, agentId, userId)
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
      // Where it came from, kept for good. The link below says who uses it
      // today, which is a different question the moment someone detaches it.
      source_agent_id: agentId,
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
  const { userId } = await getUserIdentity()
  const supabase = await createClient()
  if (!(await ownsAgent(supabase, agentId, userId))) {
    return { ok: false, reason: NOT_AGENT_OWNER }
  }

  const { data: source } = await supabase
    .from('knowledge_sources')
    .select('char_count')
    .eq('id', sourceId)
    .single()
  if (!source) return { ok: false, reason: 'That source is no longer available.' }

  const load = await agentKnowledgeLoad(supabase, agentId, userId)
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
  const { userId } = await getUserIdentity()
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
  const { userId } = await getUserIdentity()
  const supabase = await createClient()
  // Without this, RLS quietly matches no rows and the caller is told it worked
  // while the source stays attached.
  if (!(await ownsAgent(supabase, agentId, userId))) {
    return { ok: false, reason: NOT_AGENT_OWNER }
  }

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
  const { userId } = await getUserIdentity()
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

// Turn "use with every agent" on or off for a source.
//
// This is the library's reason to exist, taken to its conclusion: a voice guide
// is not a fact about one agent, it is how you write, so it should reach every
// agent you own and stay right when you edit it once. Explicit attachments are
// untouched, so a source can be both without being composed twice.
//
// Turning it ON is checked against every agent's budget first. An agent that
// cannot fit it is named, because "it didn't work" would leave someone toggling
// a switch that silently means different things on different agents.
export async function setKnowledgeScope(
  sourceId: string,
  appliesToAll: boolean
): Promise<KnowledgeResult> {
  const { userId } = await getUserIdentity()
  const supabase = await createClient()

  const { data: source } = await supabase
    .from('knowledge_sources')
    .select('char_count, applies_to_all')
    .eq('id', sourceId)
    .eq('owner_id', userId)
    .maybeSingle()
  if (!source) return { ok: false, reason: 'That source is no longer available.' }
  if (source.applies_to_all === appliesToAll) return { ok: true }

  const agentIds = await ownedAgentIds(supabase, userId)

  if (appliesToAll) {
    const tooFull: string[] = []
    for (const id of agentIds) {
      const load = await agentKnowledgeLoad(supabase, id, userId)
      const refusal = attachRefusal({
        attachedChars: load.chars,
        attachedCount: load.count,
        incomingChars: source.char_count,
      })
      if (refusal) {
        const { data: agent } = await supabase
          .from('agents')
          .select('name')
          .eq('id', id)
          .maybeSingle()
        tooFull.push(agent?.name ?? 'an agent')
      }
    }
    if (tooFull.length > 0) {
      return {
        ok: false,
        reason: `There is no room for this on ${listNames(tooFull)}. Detach something there first, or shorten this source.`,
      }
    }
  }

  const { error } = await supabase
    .from('knowledge_sources')
    .update({ applies_to_all: appliesToAll })
    .eq('id', sourceId)
    .eq('owner_id', userId)
  if (error) return { ok: false, reason: "We couldn't save that. Please try again." }

  // Every agent changes, including the ones that never linked this source:
  // that is the point of the switch, and it is also why they all need their
  // prompt rebuilt and their open session cleared.
  for (const id of agentIds) {
    await recomposeAgentPrompt(supabase, id, userId)
    revalidatePath(`/chat/${id}`)
  }
  revalidatePath('/knowledge')
  return { ok: true }
}

// "Sales Helper", or "Sales Helper and Inbox Triage", or "A, B and C".
function listNames(names: string[]): string {
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// Rename a source in the library. The title is what the agent sees as the
// source's heading in its prompt, so it is worth being able to fix.
export async function renameKnowledgeSource(
  sourceId: string,
  rawTitle: string
): Promise<KnowledgeResult> {
  const title = rawTitle.trim().replace(/\s+/g, ' ').slice(0, 120)
  if (!title) return { ok: false, reason: 'Give this a name.' }

  const { userId } = await getUserIdentity()
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
