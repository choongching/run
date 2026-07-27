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
export async function agentKnowledgeLoad(
  supabase: SupabaseClient<Database>,
  agentId: string
): Promise<{ chars: number; count: number }> {
  const { data } = await supabase
    .from('agent_knowledge')
    .select('knowledge_sources(char_count)')
    .eq('agent_id', agentId)
  const rows = data ?? []
  return {
    chars: rows.reduce(
      (sum, r) => sum + (r.knowledge_sources?.char_count ?? 0),
      0
    ),
    count: rows.length,
  }
}

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
