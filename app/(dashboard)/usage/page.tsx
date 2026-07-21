import { PageHeader, PlaceholderCard } from '@/components/page-header'

export default function UsagePage() {
  return (
    <>
      <PageHeader
        title="Usage"
        description="AI token usage and cost across all agent sessions"
      />
      <PlaceholderCard note="Usage tracking arrives in Phase 5." />
    </>
  )
}
