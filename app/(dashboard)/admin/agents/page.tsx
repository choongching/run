import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { AgentStatus } from '@/lib/types/database'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { AgentList } from '@/components/agents/agent-list'

// Listing order: working agents first, archived always at the back.
const STATUS_RANK: Record<AgentStatus, number> = {
  active: 0,
  draft: 1,
  paused: 1,
  archived: 2,
}

export default async function AgentsPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })

  const agents = (data ?? []).toSorted(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]
  )
  const activeCount = agents.filter((a) => a.status === 'active').length

  return (
    <>
      <PageHeader
        title="Agents"
        description="Create and manage your AI agents"
        action={
          <Link href="/admin/agents/new" className={buttonVariants()}>
            <Plus data-icon="inline-start" />
            New Agent
          </Link>
        }
      />
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium">
          {agents.length} agent{agents.length === 1 ? '' : 's'}
        </span>
        <span className="text-sm text-muted-foreground">
          {activeCount} active
        </span>
        <div aria-hidden className="h-px flex-1 bg-border" />
      </div>
      {agents.length > 0 ? (
        <AgentList agents={agents} />
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          No agents yet. Create your first agent to get started.
        </div>
      )}
    </>
  )
}
