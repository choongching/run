import { PageShell } from '@/components/page-shell'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageShell wide>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-1.5 h-5 max-w-md" />
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </PageShell>
  )
}
