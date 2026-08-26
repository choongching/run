'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

import { startAgentFromPrompt } from '@/app/actions/agents'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTypedPlaceholder } from '@/lib/use-typed-placeholder'
import { cn } from '@/lib/utils'

// One-click seeds that teach what an agent can be. Clicking fills the box
// (editable) rather than submitting: the user learns plain language is the
// interface. See docs/revamp-happy-path (Beat 1).
//
// Every chip must be a job the tool list in lib/tools/definitions.ts can
// actually finish (a chip is the agent's first task), and the first four
// follow the headline's cycle in order: inbox, drafts, reading, research.
// The organize chip came back once Drive write tools (folders, move,
// rename) shipped; it was removed while Drive was read-only.
//
// Written the way you would ask a colleague, not the way you would describe a
// feature: "tell me what needs a reply" is something people say out loud, and
// "answer questions from my documents" is not.
// What the placeholder types out before it rests. These are NOT the chips
// below, and the difference is the reason both exist: a chip is a short ask
// you can click, and these are what a good first prompt looks like written
// out, which is the thing the static tip describes and cannot show. Each one
// still has to be a job the tool list can finish, same rule as the chips.
const PLACEHOLDER_EXAMPLES = [
  'Read my inbox each morning and tell me what needs a reply',
  'Answer questions from the documents in my Drive',
  'Draft replies in my voice, for me to approve',
  'Watch a topic each week and write me the short version',
]

// The line it starts on and returns to for good.
//
// It used to carry a tip: "say what it should read and what you want back". A
// shorter version was tried and rejected in 2026-08-01 because the tip was the
// only teaching on the screen. The examples above now demonstrate exactly what
// that sentence described, and showing beats telling, so the tip went. If the
// examples ever go, the tip comes back with them.
const RESTING_PLACEHOLDER = 'Describe what you need done...'

const SUGGESTIONS = [
  'Tell me what needs a reply today',
  'Draft replies to the emails waiting on me',
  'Read a long document and tell me what matters',
  'Look something up and write it up for me',
  'Tidy my Drive into folders that make sense',
]

// What creation genuinely does, in its true order (see startAgentFromPrompt:
// reading the prompt, the naming call, buildSystemPrompt, buildAgentToolset,
// the remote create, the thread). The timings approximate what each step
// costs; the words never claim work that is not happening. No fake streamed
// "thinking": we stream nothing during creation, and showing invented
// reasoning would be a lie. The last line is a patience line for slow
// creates only; a typical build lands around the fourth.
const BUILD_STAGES = [
  'Reading your description',
  'Working out what you need done',
  'Choosing a name',
  'Writing its instructions',
  'Picking the tools it will need',
  'Setting up its workspace',
  'Nearly there',
]

function BuildingState() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    // Each line holds about two seconds: long enough to read, short enough
    // that the sequence feels like work moving.
    const timers = [2000, 4000, 6000, 8200, 10500, 13000].map((ms, i) =>
      setTimeout(() => setStage(i + 1), ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    // Absolutely centered over the whole hero region: the faded-out mark and
    // headline keep their layout space (they only fade, so nothing jumps),
    // which would push an in-flow block below true center. Text only, no
    // mark (founder call: the hero above already carries the brand).
    // .run-building also dims the rest of the hero via :has() in globals;
    // the 450ms delay lets that fade lead before this rises in.
    <div className="run-building run-rise absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center [--rise-delay:450ms]">
      <p className="text-shimmer text-base font-medium">Building your agent</p>
      {/* key={stage} replays the rise on each stage change: a quiet crossfade
          without any new animation machinery. Reduced motion still reads the
          current stage as plain text. */}
      <p key={stage} className="run-rise text-sm text-muted-foreground">
        {BUILD_STAGES[stage]}
      </p>
    </div>
  )
}

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
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function pickSuggestion(text: string) {
    setValue(text)
    textareaRef.current?.focus()
  }

  const blocked = blockedReason !== null
  const canSubmit = value.trim().length > 0 && !pending && !blocked

  // Only while the box is genuinely idle: empty, nobody in it, nothing more
  // urgent for the placeholder to be saying.
  const placeholder = useTypedPlaceholder({
    examples: PLACEHOLDER_EXAMPLES,
    resting: RESTING_PLACEHOLDER,
    active: !blocked && !pending && !focused && value.length === 0,
  })

  // Show the creation state first, submit a beat later. The head start buys
  // the fade-out room to play and the first stage lines a moment to be read,
  // before the real work (which the stages then narrate) begins. 3s head
  // start plus a ~4s create means about four lines show on a typical build;
  // the founder chose depth of moment over raw speed here.
  function startBuild() {
    if (!canSubmit) return
    setPending(true)
    setTimeout(() => formRef.current?.requestSubmit(), 3000)
  }

  // The form is built once and wrapped in a tooltip only when blocked: the
  // placeholder says what to do, the tooltip says why (the plan's limit),
  // and no line under the composer repeats either.
  const composerForm = (
      <form
        ref={formRef}
        action={startAgentFromPrompt}
        // Hidden (not unmounted) while building: the in-flight server action
        // belongs to this form, so it must stay in the tree.
        // rounded-[9px] is a founder-set hero exception to the 4-6px radius
        // scale, local to this composer only.
        className={cn(
          'run-rise rounded-[9px] border border-input bg-card run-focus-fade [--rise-delay:180ms] focus-within:border-ring focus-within:shadow-focus',
          pending && 'hidden'
        )}
      >
        <textarea
          ref={textareaRef}
          name="prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
              e.preventDefault()
              startBuild()
            }
          }}
          rows={4}
          disabled={blocked}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // Static, because the placeholder moves. With no visible label the
          // placeholder is what a screen reader announces as the field's name,
          // and a name that changes twenty times a second is not one.
          aria-label="Describe what you need done"
          placeholder={
            blocked ? 'Delete an agent to make room for a new one' : placeholder
          }
          // Hero sizing, home only: body-size text in a roomier box. The rest
          // of the app keeps text-sm inputs.
          className="w-full resize-none bg-transparent px-5 pt-4 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-end px-3.5 pb-3.5">
          <Button
            type="button"
            onClick={startBuild}
            disabled={!canSubmit}
            aria-label="Build agent"
            // Hero sizing, home only: a touch over the default button
            // (15% up, then 9% back down on review = about 5% net).
            // Icon-only on mobile: a square arrow at the tap floor, the send
            // affordance a phone already knows; the words return at md. The
            // aria-label keeps the name for screen readers on both.
            className="size-11 px-0 md:h-9.5 md:w-auto md:px-4.5 md:text-[15px]"
          >
            <span className="max-md:hidden">
              {pending ? 'Building...' : 'Build my agent'}
            </span>
            {!pending && <ArrowUp className="size-5 md:size-4" />}
          </Button>
        </div>
      </form>
  )

  return (
    <div className="w-full">
      {pending && <BuildingState />}
      {blocked ? (
        <TooltipProvider delay={300}>
          <Tooltip>
            <TooltipTrigger render={<div />}>{composerForm}</TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {blockedReason}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        composerForm
      )}

      <div
        className={cn(
          'run-rise mt-5 flex flex-wrap justify-center gap-2.5 [--rise-delay:270ms]',
          pending && 'hidden'
        )}
      >
        {SUGGESTIONS.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => pickSuggestion(text)}
            disabled={pending || blocked}
            className="min-h-11 rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 md:min-h-0"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
