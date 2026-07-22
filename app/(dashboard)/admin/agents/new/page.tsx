import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { AgentForm } from '@/components/agents/agent-form'

export default async function NewAgentPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_context')
    .limit(1)
    .single()

  return (
    <>
      <PageHeader
        title="New Agent"
        description="Define the agent's role, model, and system prompt"
      />
      <AgentForm
        mode="create"
        hasCompanyContext={Boolean(settings?.company_context?.trim())}
      />
    </>
  )
}
