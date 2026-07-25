import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AgentBehaviorCard } from '@/components/agents/agent-behavior-card'
import { AgentForm } from '@/components/agents/agent-form'
import { AgentSharingCard } from '@/components/agents/agent-sharing-card'
import { AgentStatusChip } from '@/components/agents/agent-status-chip'

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId, profile } = await getUserProfile()
  const { id } = await params
  const supabase = await createClient()

  const [{ data: agent }, { data: settings }] = await Promise.all([
    supabase.from('agents').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('company_settings')
      .select('company_context, pipedream_account_id, pipedream_connected_by')
      .limit(1)
      .single(),
  ])

  if (!agent) notFound()
  // Editing is owner-or-admin; run-only viewers land back on the hub.
  const isOwner = agent.owner_id === userId
  if (!isOwner && profile?.role !== 'admin') redirect('/agents')

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name')
    .neq('id', agent.owner_id ?? userId)
    .order('display_name')

  const { data: shares } = await supabase
    .from('user_agents')
    .select('user_id, is_active, profiles(display_name)')
    .eq('agent_id', id)

  return (
    <>
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/agents" />}>
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
      <div className="mt-4 grid max-w-3xl gap-4">
        <AgentBehaviorCard agent={agent} />
        <AgentSharingCard
          agentId={agent.id}
          visibility={agent.visibility}
          members={(members ?? []).map((m) => ({
            id: m.id,
            name: m.display_name ?? 'Unnamed member',
          }))}
          initialShares={(shares ?? [])
            .filter((s) => s.is_active)
            .map((s) => ({
              userId: s.user_id,
              name:
                (s.profiles as { display_name: string | null } | null)
                  ?.display_name ?? 'Unnamed member',
            }))}
        />
      </div>
    </>
  )
}
