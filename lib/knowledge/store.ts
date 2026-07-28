import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import { MAX_LIBRARY_SOURCES } from '@/lib/knowledge/limits'
import type { Database } from '@/lib/types/database'

// Shared server-side reads and helpers for knowledge. These live outside the
// 'use server' action module because a file marked 'use server' may only export
// async actions with serializable arguments, and these take a Supabase client.

// Identifies the exact text of a source: dedupes a re-upload of an unchanged
// file, and later tells a connector sync whether anything really changed.
export function checksumOf(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

// What an agent already carries, for the per-agent budget check and the meter.
//
// Counts always-on sources as well as explicitly attached ones, because both
// are composed into the prompt and both cost the same on every turn. Leaving
// the always-on ones out would let an agent quietly exceed the cap the meter
// claims to be enforcing. Deduped by id, matching how loadAgentKnowledge
// composes them.
export async function agentKnowledgeLoad(
  supabase: SupabaseClient<Database>,
  agentId: string,
  ownerId: string
): Promise<{ chars: number; count: number }> {
  const [{ data: linked }, { data: everywhere }] = await Promise.all([
    supabase
      .from('agent_knowledge')
      .select('source_id, knowledge_sources(char_count)')
      .eq('agent_id', agentId),
    supabase
      .from('knowledge_sources')
      .select('id, char_count')
      .eq('owner_id', ownerId)
      .eq('applies_to_all', true),
  ])

  const chars = new Map<string, number>()
  for (const s of everywhere ?? []) chars.set(s.id, s.char_count)
  for (const row of linked ?? []) {
    if (chars.has(row.source_id)) continue
    chars.set(row.source_id, row.knowledge_sources?.char_count ?? 0)
  }

  return {
    chars: [...chars.values()].reduce((sum, n) => sum + n, 0),
    count: chars.size,
  }
}

// Every agent this user owns, for the changes that touch all of them at once.
export async function ownedAgentIds(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('owner_id', userId)
  return (data ?? []).map((a) => a.id)
}

// Whether the caller owns this agent, which is who may change what it knows.
//
// RLS already refuses the attach, but refusing at the end is the wrong place:
// the source row is created first, so a blocked attach leaves an orphan in the
// user's library and reports "please try again" for something retrying cannot
// fix. Checking up front lets the action fail before it writes anything, and
// say why. RLS stays as the real boundary; this is about telling the truth.
export async function ownsAgent(
  supabase: SupabaseClient<Database>,
  agentId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('owner_id', userId)
    .maybeSingle()
  return data !== null
}

export const NOT_AGENT_OWNER =
  'Only the person who created this agent can change what it knows.'

export async function libraryIsFull(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('knowledge_sources')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
  return (count ?? 0) >= MAX_LIBRARY_SOURCES
}
