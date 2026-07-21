import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { AgentList } from '@/components/agents/agent-list'

export default async function AgentsPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })

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
      {agents && agents.length > 0 ? (
        <AgentList agents={agents} />
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          No agents yet. Create your first agent to get started.
        </div>
      )}
    </>
  )
}
