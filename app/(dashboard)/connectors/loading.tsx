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
      {/* Two cards, sized for what lands in them: five rows in the first,
          one in the second. A skeleton exists to stop the layout jumping, so
          it has to be the shape of the thing that replaces it. */}
      <div className="flex flex-col gap-5">
        <Skeleton className="h-[26rem] w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </PageShell>
  )
}
