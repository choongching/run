import { PageHeader, PlaceholderCard } from '@/components/page-header'
import { requireAdminPage } from '@/lib/auth'

export default async function IntegrationsPage() {
  await requireAdminPage()
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect org-level services. These credentials are shared across all agents and missions."
      />
      <PlaceholderCard note="Google Drive integration arrives in Phase 3." />
    </>
  )
}
