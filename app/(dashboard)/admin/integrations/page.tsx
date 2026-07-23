import { PageHeader } from '@/components/page-header'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DriveConnectCard } from '@/components/integrations/drive-connect-card'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string }>
}) {
  await requireAdminPage()
  const { drive } = await searchParams
  const oauthResult =
    drive === 'connected' ? 'connected' : drive === 'error' ? 'error' : null
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('company_settings')
    .select('pipedream_account_id, pipedream_connected_by, pipedream_connected_at')
    .not('id', 'is', null)
    .limit(1)
    .single()

  let connectedByName: string | null = null
  if (settings?.pipedream_connected_by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', settings.pipedream_connected_by)
      .single()
    connectedByName = profile?.display_name ?? null
  }

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect org-level services. These credentials are shared across all agents and missions."
      />
      <DriveConnectCard
        connected={Boolean(
          settings?.pipedream_account_id && settings.pipedream_connected_by
        )}
        connectedByName={connectedByName}
        accountId={settings?.pipedream_account_id ?? null}
        connectorId={settings?.pipedream_connected_by ?? null}
        connectedAt={settings?.pipedream_connected_at ?? null}
        environment={
          process.env.PIPEDREAM_ENVIRONMENT === 'production'
            ? 'Production'
            : 'Development'
        }
        oauthResult={oauthResult}
      />
    </>
  )
}
