import { PageHeader, PlaceholderCard } from '@/components/page-header'
import { requireAdminPage } from '@/lib/auth'

export default async function CompanyPage() {
  await requireAdminPage()
  return (
    <>
      <PageHeader
        title="Company"
        description="Brand voice and context injected into every agent at runtime."
      />
      <PlaceholderCard note="Company profile editing arrives in Phase 2." />
    </>
  )
}
