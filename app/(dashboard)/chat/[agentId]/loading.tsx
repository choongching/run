import { Skeleton } from '@/components/ui/skeleton'

// Placeholder for a chat while its agent, thread and history load. This is the
// route that gains the most from existing: it is the heaviest page in the app
// and the one reached most often, from the sidebar, so without it every agent
// click was a dead click until the whole server chain finished.
//
// The data-shell="split" attribute is load bearing, not decoration. The shell
// drops its own border and background for any route that lays out its own
// cards (see the :has([data-shell="split"]) rule in globals.css). If the
// skeleton did not carry it, the shell would draw a border while loading and
// remove it on arrival, so every chat visit would open with a visible flash of
// a card inside a card.
//
// The configure panel is closed on arrival, so there is nothing to stand in for
// on the right. One card, matching the conversation column.
export default function Loading() {
  return (
    <div data-shell="split" className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-shell border border-border bg-background px-6 pt-5 md:px-8">
        <header className="mx-auto flex w-full max-w-thread shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="size-7 rounded-lg" />
        </header>

        {/* Alternating widths and alignment so the block reads as a
            conversation rather than as a loading bar, without implying any
            particular number of messages. */}
        <div className="mx-auto flex w-full max-w-thread flex-1 flex-col gap-4 py-6">
          <Skeleton className="h-10 w-2/5 self-end rounded-xl" />
          <Skeleton className="h-20 w-4/5 rounded-xl" />
          <Skeleton className="h-10 w-1/3 self-end rounded-xl" />
          <Skeleton className="h-16 w-3/5 rounded-xl" />
        </div>

        <div className="mx-auto w-full max-w-thread pb-5">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
