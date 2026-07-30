'use client'

import { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

import { startAgentFromPrompt } from '@/app/actions/agents'
import { Button } from '@/components/ui/button'

// One-click seeds that teach what an agent can be. Clicking fills the box
// (editable) rather than submitting: the user learns plain language is the
// interface. See docs/revamp-happy-path (Beat 1).
//
// Every chip must be a job the tool list in lib/tools/definitions.ts can
// actually finish (a chip is the agent's first task), and together they
// mirror the headline's cycle: inbox, drafts, writing/research, documents.
// The organize chip came back once Drive write tools (folders, move,
// rename) shipped; it was removed while Drive was read-only.
const SUGGESTIONS = [
  'Summarize my inbox and flag what needs a reply',
  'Draft replies to emails waiting on me',
  'Research a topic and write it up for me',
  'Organize my Google Drive files',
  'Answer questions from my documents',
]

export function PromptComposer({
  // Why creating another agent is not possible right now, or null when it is.
  // The server enforces the same rule; this only saves the user from typing a
  // prompt that was never going to run.
  blockedReason = null,
}: {
  blockedReason?: string | null
}) {
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function pickSuggestion(text: string) {
    setValue(text)
    textareaRef.current?.focus()
  }

  const blocked = blockedReason !== null
  const canSubmit = value.trim().length > 0 && !pending && !blocked

  return (
    <div className="w-full">
      <form
        action={startAgentFromPrompt}
        onSubmit={() => setPending(true)}
        className="rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring/50"
      >
        <textarea
          ref={textareaRef}
          name="prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          rows={4}
          disabled={blocked}
          placeholder={
            blocked
              ? 'Delete an agent to make room for a new one'
              : 'Describe what you need done, and Run will build an agent for you... (Tip: say what it should read and what you want back)'
          }
          // Hero sizing, home only: body-size text in a roomier box. The rest
          // of the app keeps text-sm inputs.
          className="w-full resize-none bg-transparent px-5 pt-4 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-end px-3.5 pb-3.5">
          <Button
            type="submit"
            disabled={!canSubmit}
            aria-label="Build agent"
            // Hero sizing, home only: a touch over the default button
            // (15% up, then 9% back down on review = about 5% net).
            className="h-9.5 px-4.5 text-[15px]"
          >
            {pending ? 'Building...' : 'Build my agent'}
            {!pending && <ArrowUp className="size-4" />}
          </Button>
        </div>
      </form>

      {blockedReason && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {blockedReason}
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {SUGGESTIONS.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => pickSuggestion(text)}
            disabled={pending || blocked}
            className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
