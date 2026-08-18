import { PageShell } from '@/components/page-shell'
import { Skeleton } from '@/components/ui/skeleton'

// Placeholder for the connectors page. The row count here is honest, which is
// the only thing that stops a skeleton causing the layout jump it exists to
// prevent: three connectable apps, plus the two static rows (web search and
// Claude) that always render.
export default function Loading() {
  return (
    <PageShell>
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1.5 h-5 w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </PageShell>
  )
}
