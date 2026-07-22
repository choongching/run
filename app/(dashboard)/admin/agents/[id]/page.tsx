import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { AgentForm } from '@/components/agents/agent-form'

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
    supabase.from('company_settings').select('company_context').limit(1).single(),
  ])

  if (!agent) notFound()

  return (
    <>
      <PageHeader
        title={agent.name}
        description="Edit this agent's configuration and system prompt"
      />
      <AgentForm
        mode="edit"
        agent={agent}
        hasCompanyContext={Boolean(settings?.company_context?.trim())}
      />
    </>
  )
}
