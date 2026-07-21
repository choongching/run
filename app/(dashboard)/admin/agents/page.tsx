import { PageHeader, PlaceholderCard } from '@/components/page-header'
import { requireAdminPage } from '@/lib/auth'

export default async function AgentsPage() {
  await requireAdminPage()
  return (
    <>
      <PageHeader title="Agents" description="Create and manage your AI agents" />
      <PlaceholderCard note="Agent management arrives in Phase 2." />
    </>
  )
}
