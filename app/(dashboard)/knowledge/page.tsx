import { PageHeader } from '@/components/page-header'
import { PageShell } from '@/components/page-shell'
import {
  KnowledgeLibrary,
  type LibrarySource,
} from '@/components/knowledge/knowledge-library'
import { getUserIdentity } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

// The library: every source this user owns, and which agents use each one.
//
// Adding and attaching happen inside an agent's Configure panel, where the
// intent actually is ("it wrote that in the wrong voice"). This page is the
// management half: see everything at once, spot duplicates, rename, delete. It
// is also the only place an orphaned source (attached to nothing) can be
// reached, which is why the split matters rather than being cosmetic.
export default async function KnowledgePage() {
  const { userId } = await getUserIdentity()
  const supabase = await createClient()

  const [{ data: sources }, { data: links }] = await Promise.all([
    supabase
      .from('knowledge_sources')
      .select(
        'id, title, kind, char_count, origin, applies_to_all, created_at, updated_at, added_in:agents!knowledge_sources_source_agent_id_fkey(id, name)'
      )
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false }),
    supabase.from('agent_knowledge').select('source_id, agents(id, name)'),
  ])

  // Which agents use each source. RLS scopes the links to agents this user
  // owns, which is the same set they can act on.
  const usage = new Map<string, { id: string; name: string }[]>()
  for (const link of links ?? []) {
    if (!link.agents) continue
    const list = usage.get(link.source_id) ?? []
    list.push({ id: link.agents.id, name: link.agents.name })
    usage.set(link.source_id, list)
  }

  const items: LibrarySource[] = (sources ?? []).map((s) => {
    // A file source's origin holds the document it came from; a note's holds
    // at most the trimmed flag.
    const origin = s.origin as {
      truncated?: boolean
      name?: string
      size?: number
    } | null

    return {
      id: s.id,
      title: s.title,
      kind: s.kind,
      chars: s.char_count,
      truncated: origin?.truncated === true,
      appliesToAll: s.applies_to_all,
      usedBy: usage.get(s.id) ?? [],
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      addedIn: s.added_in ?? null,
      file:
        origin?.name && typeof origin.size === 'number'
          ? { name: origin.name, size: origin.size }
          : null,
    }
  })


  return (
    <PageShell>
      <PageHeader
        title="Knowledge"
        description="What your agents always know."
      />
      <KnowledgeLibrary items={items} />
    </PageShell>
  )
}
