import { PageHeader } from '@/components/page-header'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { EnvironmentCard } from '@/components/integrations/environment-card'

export default async function IntegrationsPage() {
  await requireAdminPage()
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('company_settings')
    .select('anthropic_environment_id')
    .not('id', 'is', null)
    .limit(1)
    .single()

  return (
    <>
      <PageHeader
        title="Connections"
        description="Set up the shared agent runtime. Members connect their own Gmail and Drive from inside a chat when an agent needs them."
      />
      <EnvironmentCard
        environmentId={settings?.anthropic_environment_id ?? null}
      />
    </>
  )
}
