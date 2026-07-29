'use client'

import { CircleAlert, RotateCcw } from 'lucide-react'

import type { ChatError } from '@/lib/chat/errors'

// A turn that did not land, said plainly.
//
// Deliberately not red. Red belongs to something that destroyed or sent
// something; a turn that failed is a hiccup, and shouting about it makes the
// whole product feel fragile. The conversation is still fine, and the composer
// below it still works, so this reads as a note in the flow rather than an
// alarm across it.
export function ErrorNote({
  error,
  onRetry,
}: {
  error: ChatError
  onRetry?: () => void
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{error.message}</span>
          {error.sub && (
            <span className="text-xs text-muted-foreground">{error.sub}</span>
          )}
        </div>

        {(error.retry && onRetry) || error.reference ? (
          <div className="flex flex-wrap items-center gap-2.5">
            {error.retry && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
              >
                <RotateCcw className="size-3.5" />
                Try again
              </button>
            )}
            {/* Only ever shown when the fault was ours, so it gives someone
                something to quote and us something to search for. */}
            {error.reference && (
              <span className="font-mono text-[0.6875rem] text-muted-foreground">
                ref {error.reference}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
