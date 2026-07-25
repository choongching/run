import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { AgentStatus } from '@/lib/types/database'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { AgentList, type AgentWithOwner } from '@/components/agents/agent-list'

// Listing order within a section: working agents first, archived at the back.
const STATUS_RANK: Record<AgentStatus, number> = {
  active: 0,
  draft: 1,
  paused: 1,
  archived: 2,
}

function Section({
  title,
  caption,
  agents,
  currentUserId,
  canManageAll,
}: {
  title: string
  caption: string
  agents: AgentWithOwner[]
  currentUserId: string
  canManageAll: boolean
}) {
  if (agents.length === 0) return null
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{agents.length}</span>
        <span className="text-xs text-muted-foreground">{caption}</span>
        <div aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <AgentList
        agents={agents}
        currentUserId={currentUserId}
        canManageAll={canManageAll}
      />
    </section>
  )
}

export default async function AgentsPage() {
  const { userId, profile } = await getUserProfile()
  const isAdmin = profile?.role === 'admin'
  const supabase = await createClient()

  // RLS already scopes this to what the caller may see: their own agents,
  // company-visible ones, agents shared to them, and (admins) everything.
  const { data } = await supabase
    .from('agents')
    .select('*, owner:profiles(display_name)')
    .order('created_at', { ascending: false })

  const agents = ((data ?? []) as AgentWithOwner[]).toSorted(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]
  )

  const yours = agents.filter((a) => a.owner_id === userId)
  const company = agents.filter(
    (a) => a.owner_id !== userId && a.visibility === 'company'
  )
  // Visible despite being private and not yours: shared to you, or (admins)
  // the governance view of other people's private agents.
  const shared = agents.filter(
    (a) => a.owner_id !== userId && a.visibility === 'private'
  )

  return (
    <>
      <PageHeader
        title="Agents"
        description="Build one, or run an agent someone else made"
        action={
          <Link href="/agents/new" className={buttonVariants()}>
            <Plus data-icon="inline-start" />
            New Agent
          </Link>
        }
      />
      {agents.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          No agents yet. Build the first one for your company.
        </div>
      ) : (
        <>
          <Section
            title="Yours"
            caption="Agents you built and own"
            agents={yours}
            currentUserId={userId}
            canManageAll={isAdmin}
          />
          <Section
            title={isAdmin ? 'Private agents (admin view)' : 'Shared with you'}
            caption={
              isAdmin
                ? 'Private to their owners; visible to you as an admin'
                : 'Shared to you by their owners'
            }
            agents={shared}
            currentUserId={userId}
            canManageAll={isAdmin}
          />
          <Section
            title="From your company"
            caption="Visible to everyone at the company"
            agents={company}
            currentUserId={userId}
            canManageAll={isAdmin}
          />
        </>
      )}
    </>
  )
}
