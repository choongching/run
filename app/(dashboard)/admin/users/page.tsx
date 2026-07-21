import { PageHeader, PlaceholderCard } from '@/components/page-header'
import { requireAdminPage } from '@/lib/auth'

export default async function UsersPage() {
  await requireAdminPage()
  return (
    <>
      <PageHeader
        title="Users"
        description="Manage users and their agent assignments"
      />
      <PlaceholderCard note="User management arrives in Phase 2." />
    </>
  )
}
