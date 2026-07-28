'use client'

import { useState } from 'react'
import { Loader2, ShieldQuestion } from 'lucide-react'

export type ApprovalCall = { id: string; title: string; detail: string }

// Shown in the thread when the agent wants to run a write action (e.g. create
// a draft). Nothing happens until the user approves. "Writes ask first."
export function ApprovalCard({
  calls,
  onDecision,
}: {
  calls: ApprovalCall[]
  onDecision: (decision: 'approve' | 'deny') => void
}) {
  const [pending, setPending] = useState<'approve' | 'deny' | null>(null)

  function decide(decision: 'approve' | 'deny') {
    if (pending) return
    setPending(decision)
    onDecision(decision)
  }

  return (
    <div className="rounded-xl border border-ring/60 bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldQuestion className="size-4 text-muted-foreground" />
        Approve this action?
      </div>
      <div className="mt-3 space-y-3">
        {calls.map((call) => (
          <div key={call.id} className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium">{call.title}</p>
            {call.detail && (
              <pre className="mt-1.5 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                {call.detail}
              </pre>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => decide('deny')}
          disabled={pending !== null}
          className="flex h-8 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {pending === 'deny' ? 'Cancelling' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={() => decide('approve')}
          disabled={pending !== null}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-60"
        >
          {pending === 'approve' && <Loader2 className="size-3.5 animate-spin" />}
          Approve
        </button>
      </div>
    </div>
  )
}
