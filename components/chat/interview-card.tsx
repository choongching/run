'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

import { RowBox } from '@/components/section-card'
import type { AskSpec } from '@/lib/tools/definitions'
import { cn } from '@/lib/utils'

// The agent's questions, as one card the person walks through.
//
// A round arrives in a single tool call (see AskSpec), so every step here is
// local state: picking, going back, changing an earlier answer and moving on
// again all happen without touching the server, and nothing is sent until
// Save. That is the whole reason Back can exist. It is also why the counter
// takes an offset: a second round continues the interview's count instead of
// starting over at one.
//
// What a step cannot do is go forward past itself. Next stays off until the
// step has an answer, because an interview that lets you skip the question is
// a form with optional fields, and the agent has to act on what comes back.
export function InterviewCard({
  spec,
  onAnswer,
}: {
  spec: AskSpec
  // The answers, in the order the questions were asked.
  onAnswer: (answers: string[]) => void
}) {
  const { questions } = spec
  const [step, setStep] = useState(0)
  const [picks, setPicks] = useState<(number | 'other' | null)[]>(() =>
    questions.map(() => null)
  )
  const [others, setOthers] = useState<string[]>(() => questions.map(() => ''))
  const [saving, setSaving] = useState(false)

  // What a step would send, or null while it has nothing to send. "Something
  // else" with an empty box counts as nothing, so Next stays off until they
  // have actually written it.
  function answerAt(i: number): string | null {
    const pick = picks[i]
    if (pick === null) return null
    if (pick === 'other') return others[i].trim() || null
    return questions[i].options[pick]?.label ?? null
  }

  const current = questions[step]
  const answer = answerAt(step)
  const last = step === questions.length - 1
  // Where this round's questions sit in the interview as a whole.
  const offset = typeof spec.step === 'number' && spec.step > 0 ? spec.step : 1
  const total =
    typeof spec.total === 'number' && spec.total >= questions.length
      ? spec.total
      : offset - 1 + questions.length

  function pick(value: number | 'other') {
    if (saving) return
    setPicks((prev) => prev.map((p, i) => (i === step ? value : p)))
  }

  function advance() {
    if (saving || answerAt(step) === null) return
    if (!last) {
      setStep(step + 1)
      return
    }
    setSaving(true)
    onAnswer(questions.map((_, i) => answerAt(i) ?? ''))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {offset + step} of {total}
          </span>
          {current.title && (
            <span className="truncate text-xs font-medium">{current.title}</span>
          )}
        </div>
        {/* The rail is the fast way back, and it says up front that going back
            is allowed. Hidden below md: a pip cannot reach the 44px tap floor
            without owning the header, and Back covers the same ground on a
            phone one step at a time. */}
        <div className="hidden items-center gap-1.5 md:flex">
          {questions.map((q, i) => {
            const done = answerAt(i) !== null
            const here = i === step
            return (
              <button
                key={i}
                type="button"
                disabled={!done || here || saving}
                onClick={() => setStep(i)}
                aria-label={
                  here
                    ? `Question ${offset + i}, this one`
                    : done
                      ? `Question ${offset + i}, answered ${answerAt(i)}. Go back to it.`
                      : `Question ${offset + i}, not answered yet`
                }
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums transition-colors',
                  here
                    ? 'border-foreground text-foreground'
                    : done
                      ? 'border-primary/45 text-primary hover:bg-primary/10'
                      : 'border-border text-muted-foreground/50'
                )}
              >
                {done && !here ? <Check className="size-3" /> : offset + i}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3.5">
        <div>
          <p className="text-sm font-medium">{current.question}</p>
          {current.help && (
            <p className="mt-1 text-xs text-muted-foreground">{current.help}</p>
          )}
        </div>

        <RowBox className="bg-background">
          <div role="radiogroup" aria-label={current.question}>
            {current.options.map((opt, i) => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                description={opt.description}
                checked={picks[step] === i}
                disabled={saving}
                onPick={() => pick(i)}
              />
            ))}
            {current.allowOther && (
              <>
                <OptionRow
                  label="Something else"
                  description={
                    picks[step] === 'other' ? undefined : 'Say it in your own words'
                  }
                  checked={picks[step] === 'other'}
                  disabled={saving}
                  onPick={() => pick('other')}
                />
                {picks[step] === 'other' && (
                  <div className="bg-muted px-3 pb-3">
                    <input
                      autoFocus
                      value={others[step]}
                      onChange={(e) =>
                        setOthers((prev) =>
                          prev.map((o, i) => (i === step ? e.target.value : o))
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          advance()
                        }
                      }}
                      disabled={saving}
                      aria-label="Your own answer"
                      placeholder="Tell me what you want instead"
                      className="run-focus-fade w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/10 disabled:opacity-60 md:text-sm"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </RowBox>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-3">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={saving}
          className={cn(
            'min-h-11 rounded-lg px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60 md:min-h-9',
            step === 0 && 'invisible'
          )}
        >
          Back
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={saving || answer === null}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 md:min-h-9"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {last ? (saving ? 'Saving' : 'Save') : 'Next'}
        </button>
      </div>
    </div>
  )
}

function OptionRow({
  label,
  description,
  checked,
  disabled,
  onPick,
}: {
  label: string
  description?: string
  checked: boolean
  disabled: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      // Named explicitly: a role="radio" button computes no accessible name
      // from the two spans inside it, so a screen reader reads five unnamed
      // radios.
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        'flex min-h-11 w-full items-start gap-3 border-t border-border p-3 text-left transition-colors first:border-t-0 disabled:opacity-60',
        checked ? 'bg-muted' : 'hover:bg-muted'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
          checked ? 'border-primary' : 'border-input'
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
    </button>
  )
}

// The round once it is answered. This is not a second record of the answers:
// saving writes ONE user message holding them, and this is how that message
// renders, in the place the card was. A plain bubble repeating what the card
// already said would be the duplicate.
export function InterviewSummary({
  answers,
}: {
  answers: { q: string; a: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-xs font-medium">
        <Check className="size-3.5 text-primary" />
        Your answers
      </div>
      <div className="divide-y divide-border">
        {answers.map((entry, i) => (
          <div key={i} className="flex gap-3 px-3.5 py-2.5">
            <span className="min-w-0 flex-1 text-xs text-muted-foreground">
              {entry.q}
            </span>
            <span className="max-w-[55%] text-xs font-medium">{entry.a}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
