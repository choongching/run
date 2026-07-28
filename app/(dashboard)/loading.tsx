import { Skeleton } from '@/components/ui/skeleton'

// Shown while the home page resolves.
//
// Its real job is not the pixels. A dynamic route is only partially prefetched
// when it has a loading file, so this is what lets Next fetch the shell ahead
// of the click and start the transition immediately instead of leaving the
// link dead until the server finishes.
//
// The shape mirrors app/(dashboard)/page.tsx exactly (same padding, same
// centred max-w-2xl column, same block sizes) so the real content replaces it
// in place rather than shifting the page.
export default function Loading() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-6 py-16 md:px-8">
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
        <Skeleton className="mb-6 size-11 rounded-xl" />
        <Skeleton className="mb-8 h-8 w-80 max-w-full" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  )
}
