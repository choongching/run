import { PageShell } from '@/components/page-shell'
import { Skeleton } from '@/components/ui/skeleton'

// Placeholder for the connectors page. The row count here is honest: the
// connector list is a fixed catalogue of two apps, so two rows is what always
// arrives.
export default function Loading() {
  return (
    <PageShell>
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1.5 h-5 w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </PageShell>
  )
}
