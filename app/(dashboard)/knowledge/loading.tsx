import { Skeleton } from '@/components/ui/skeleton'

// Placeholder for the knowledge library while its sources and links load.
// Padding matches the page so the header lands in the same place.
export default function Loading() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1.5 h-5 w-full max-w-xl" />
      </div>
      <div className="flex flex-col gap-2">
        {/* A fixed three rows rather than a guess at the real count: this
            stands in for "a list is coming", and pretending to know its
            length would only make the swap more jarring when it is wrong. */}
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
