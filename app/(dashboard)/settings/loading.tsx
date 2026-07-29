import { PageShell } from '@/components/page-shell'
import { Skeleton } from '@/components/ui/skeleton'

// Placeholder for the account page: the profile card and the sign-out card,
// in the same centered column the real page uses.
export default function Loading() {
  return (
    <PageShell>
      <div className="mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-1.5 h-5 w-40" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </PageShell>
  )
}
