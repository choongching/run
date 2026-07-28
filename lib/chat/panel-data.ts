import type { SupabaseClient } from '@supabase/supabase-js'

import type { KnowledgeItem } from '@/components/chat/knowledge-section'
import type { ConnectorState } from '@/components/connectors/connector-list'
import { getUserConnection } from '@/lib/pipedream/connections'
import type { Database } from '@/lib/types/database'

export type PanelExtras = {
  connections: ConnectorState
  knowledge: KnowledgeItem[]
  knowledgeLibrary: KnowledgeItem[]
}

type SourceRow = {
  id: string
  title: string
  kind: 'note' | 'file'
  char_count: number
  origin: unknown
  applies_to_all: boolean
}

function toItem(s: SourceRow): KnowledgeItem {
  return {
    id: s.id,
    title: s.title,
    kind: s.kind,
    chars: s.char_count,
    truncated: (s.origin as { truncated?: boolean } | null)?.truncated === true,
    appliesToAll: s.applies_to_all,
  }
}

// Everything the Configure panel shows that the chat page does not otherwise
// need: which apps the user has connected, what this agent carries, and the
// rest of their library.
//
// This lives away from the page because the panel is no longer rendered with
// the conversation. It used to cost four queries on every chat load to
// populate a panel that starts closed and most visits never open, so it is
// fetched when the panel opens instead. Keeping it in one function means the
// route handler that serves it cannot drift from what the panel expects.
export async function loadPanelExtras(
  supabase: SupabaseClient<Database>,
  agentId: string,
  userId: string
): Promise<PanelExtras> {
  const [gmailConn, driveConn, { data: attachedRows }, { data: libraryRows }] =
    await Promise.all([
      getUserConnection(supabase, userId, 'gmail'),
      getUserConnection(supabase, userId, 'google_drive'),
      supabase
        .from('agent_knowledge')
        .select(
          'created_at, knowledge_sources(id, title, kind, char_count, origin, applies_to_all)'
        )
        .eq('agent_id', agentId)
        .order('created_at', { ascending: true }),
      supabase
        .from('knowledge_sources')
        .select('id, title, kind, char_count, origin, applies_to_all')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false }),
    ])

  // What the agent actually carries is the union of what is attached to it and
  // everything the owner marked as applying to every agent. The panel has to
  // show both or its list and its budget meter would both understate the
  // prompt, and detaching would look broken on a source that is not attached.
  const attached = (attachedRows ?? [])
    .map((r) => r.knowledge_sources)
    .filter((s) => s !== null)
    .map(toItem)
  const attachedIds = new Set(attached.map((s) => s.id))
  const everywhere = (libraryRows ?? [])
    .filter((s) => s.applies_to_all && !attachedIds.has(s.id))
    .map(toItem)

  const knowledge = [...everywhere, ...attached]
  const carriedIds = new Set(knowledge.map((s) => s.id))
  const knowledgeLibrary = (libraryRows ?? [])
    .filter((s) => !carriedIds.has(s.id))
    .map(toItem)

  return {
    connections: { gmail: !!gmailConn, google_drive: !!driveConn },
    knowledge,
    knowledgeLibrary,
  }
}
