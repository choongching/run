'use client'

import { useState } from 'react'
import { ArrowUp, Loader2, Sparkles } from 'lucide-react'

import type { AskSpec } from '@/lib/tools/definitions'

// The agent's question, rendered as tappable options with a free-text escape.
// Tapping an option answers immediately; the answer resumes the paused session.
// This is the setup interview's one-question-at-a-time surface.
export function OptionsCard({
  spec,
  onAnswer,
}: {
  spec: AskSpec
  onAnswer: (answer: string) => void
}) {
  const [other, setOther] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)

  function answer(value: string) {
    const v = value.trim()
    if (!v || submitted) return
    setSubmitted(v)
    onAnswer(v)
  }

  const hasStep =
    typeof spec.step === 'number' && typeof spec.total === 'number' && spec.total > 0

  return (
    <div className="rounded-xl border border-ring/60 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-muted-foreground" />
          Quick setup
        </div>
        {hasStep && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {spec.step} of {spec.total}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm font-medium">{spec.question}</p>
      {spec.help && (
        <p className="mt-1 text-xs text-muted-foreground">{spec.help}</p>
      )}

      {spec.options.length > 0 && (
        <div className="mt-3 space-y-2">
          {spec.options.map((opt) => {
            const active = submitted === opt.label
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => answer(opt.label)}
                disabled={submitted !== null}
                className={
                  'flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors ' +
                  (active
                    ? 'border-ring'
                    : 'border-border hover:bg-muted disabled:hover:bg-background') +
                  ' disabled:opacity-60'
                }
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{opt.label}</span>
                  {opt.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  )}
                </span>
                {active && (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {spec.allowOther && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring/50">
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                answer(other)
              }
            }}
            disabled={submitted !== null}
            placeholder={
              spec.options.length > 0 ? 'Or type your own answer' : 'Type your answer'
            }
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => answer(other)}
            disabled={submitted !== null || other.trim().length === 0}
            aria-label="Send answer"
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
