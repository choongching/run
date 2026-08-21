import { PageShell } from '@/components/page-shell'
import { Skeleton } from '@/components/ui/skeleton'

// Placeholder for the knowledge library while its sources and links load.
// Same centered column as the page, so the header lands in the same place.
export default function Loading() {
  return (
    <PageShell>
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1.5 h-5 w-full max-w-md" />
      </div>
      {/* One card, at a fixed height rather than a guess at the real row
          count: this stands in for "a library is coming", and pretending to
          know its length would only make the swap more jarring when it is
          wrong. */}
      <Skeleton className="h-64 w-full rounded-xl" />
    </PageShell>
  )
}
