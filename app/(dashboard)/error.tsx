'use client'

import { useEffect } from 'react'
import { CircleAlert, RotateCcw } from 'lucide-react'

// The last line of defence: a crash in the page itself, rather than in a turn.
//
// Everything else that fails in the chat is caught on the way back from the
// server and said in a sentence. This catches the other half, a render that
// throws, which would otherwise leave someone staring at a blank white screen
// with no way to tell whether it was them, us, or the network.
//
// Next 16 names the recovery callback unstable_retry, not reset.
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('dashboard render error', error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <CircleAlert className="size-6 text-muted-foreground" />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-medium">This page did not load.</h2>
          <p className="text-sm text-muted-foreground">
            Something went wrong on our end. Your agents and conversations are
            safe.
          </p>
        </div>
        <button
          type="button"
          onClick={unstable_retry}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <RotateCcw className="size-3.5" />
          Try again
        </button>
        {/* The digest is what our logs are keyed by, so it is the one piece of
            machine text worth showing. */}
        {error.digest && (
          <span className="font-mono text-[0.6875rem] text-muted-foreground">
            ref {error.digest}
          </span>
        )}
      </div>
    </div>
  )
}
