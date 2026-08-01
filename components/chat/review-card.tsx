'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

import { GmailIcon } from '@/components/icons/gmail'
import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { RoutinesIcon } from '@/components/nav-icons'
import type { NeededConnector } from '@/lib/chat/onboarding'

export type ReviewSpec = {
  name: string
  instructions: string
  connectors: NeededConnector[]
  cadence?: string
}

const CONNECTOR_LABEL: Record<NeededConnector, string> = {
  gmail: 'Gmail',
  google_drive: 'Google Drive',
}

// The last thing between an agent being set up and it starting work.
//
// Until now the interview ended and the agent began immediately: the name was
// chosen for the person and never shown, and their answers were written into
// its instructions without them reading a word. This is the same promise the
// product already makes about sending an email, applied to the agent's own
// setup.
//
// Three ways out, because "looks good" cannot be the only one. Edit either
// field for a clumsy word, tell the agent what to change in the composer if it
// misunderstood, or confirm.
export function ReviewCard({
  spec,
  onConfirm,
}: {
  spec: ReviewSpec
  onConfirm: (values: { name: string; instructions: string }) => void
}) {
  const [name, setName] = useState(spec.name)
  const [instructions, setInstructions] = useState(spec.instructions)
  const [submitted, setSubmitted] = useState(false)

  const ready = name.trim().length > 0 && instructions.trim().length > 0

  function confirm() {
    if (!ready || submitted) return
    setSubmitted(true)
    onConfirm({ name: name.trim(), instructions: instructions.trim() })
  }

  return (
    <div className="rounded-xl border border-ring/60 bg-card p-4">
      <div className="text-sm font-medium">Before I start</div>

      <div className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">I will be called</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitted}
            maxLength={60}
            className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">and my job is</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={submitted}
            rows={3}
            className="w-full resize-y rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm leading-relaxed run-focus-fade outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 disabled:opacity-60"
          />
        </label>

        {/* The timing reads as its own section in the same voice as the two
            above it, rather than being left inside the job paragraph where
            "Each weekday..." was easy to read straight past. The dashed edge
            is the point: unlike the name and the job, this is not saved when
            they confirm. The offer to make it real comes after the first
            piece of work, so they agree to a routine having seen what one run
            actually produces. */}
        {spec.cadence && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              and my routine is
            </span>
            <span className="flex items-center gap-2 rounded-lg border border-dashed border-input px-2.5 py-1.5 text-sm">
              <RoutinesIcon className="size-3.5 shrink-0 text-muted-foreground" />
              {spec.cadence}
            </span>
            <span className="text-xs text-muted-foreground">
              Nothing is scheduled yet. I will offer to set this up once you
              have seen the first one.
            </span>
          </div>
        )}
      </div>

      {/* Named only when the person named it first. Every agent is handed the
          same tools today, so listing what it *could* touch would tell someone
          whose agent reads documents that it also wants their email. */}
      {spec.connectors.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Needs access to</span>
          {spec.connectors.map((app) => (
            <span key={app} className="flex items-center gap-1.5 text-xs">
              {app === 'gmail' ? (
                <GmailIcon className="size-3.5" />
              ) : (
                <GoogleDriveIcon className="size-3.5" />
              )}
              {CONNECTOR_LABEL[app]}
            </span>
          ))}
          <span className="text-xs text-muted-foreground">
            I will ask when I need it
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={!ready || submitted}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {submitted ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        {submitted ? 'Getting started' : 'Looks good, get started'}
      </button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Or tell me what to change
      </p>
    </div>
  )
}
