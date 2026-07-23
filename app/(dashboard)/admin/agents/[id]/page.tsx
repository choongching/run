import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AgentForm } from '@/components/agents/agent-form'
import { AgentStatusChip } from '@/components/agents/agent-status-chip'

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPage()
  const { id } = await params
  const supabase = await createClient()

  const [{ data: agent }, { data: settings }] = await Promise.all([
    supabase.from('agents').select('*').eq('id', id).single(),
    supabase
      .from('company_settings')
      .select('company_context, pipedream_account_id, pipedream_connected_by')
      .limit(1)
      .single(),
  ])

  if (!agent) notFound()

  return (
    <>
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/admin/agents" />}>
                Agents
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{agent.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{agent.name}</h1>
          <AgentStatusChip status={agent.status} />
        </div>
        <p className="mt-1.5 text-base text-muted-foreground">
          {agent.description?.trim() ||
            "Edit this agent's configuration and system prompt"}
        </p>
      </div>
      <AgentForm
        mode="edit"
        agent={agent}
        hasCompanyContext={Boolean(settings?.company_context?.trim())}
        driveConnected={Boolean(
          settings?.pipedream_account_id && settings.pipedream_connected_by
        )}
      />
    </>
  )
}
