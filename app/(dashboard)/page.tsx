import { AmbientBackdrop } from '@/components/home/ambient-backdrop'
import { FlipWord } from '@/components/home/flip-word'
import { Greeting } from '@/components/home/greeting'
import { PromptComposer } from '@/components/home/prompt-composer'
import { getUserProfile } from '@/lib/auth'
import { canCreateAgent } from '@/lib/entitlements/assert'
import { createClient } from '@/lib/supabase/server'
import { firstName } from '@/lib/user-name'

// What the headline cycles through. Only things Run can actually do today:
// it reads Gmail and Drive and searches the web, so the list stays inside
// that. Promising a kind of agent the product cannot build is a worse first
// impression than a shorter list.
//
// All four have to sit naturally after the same verb, which is what the
// earlier list got wrong: "put an agent on your writing" does not sound like
// anything a person would say, and "your reading" does.
const AGENT_KINDS = ['inbox.', 'drafts.', 'reading.', 'research.'] as const

// The prompt-first home: one line, one box, a few seeds. Submitting creates an
// agent and opens its chat.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { userId, profile } = await getUserProfile()
  const { error } = await searchParams

  // Ask the same helper the server action asks, so the box is only enabled
  // when submitting it would actually work.
  const supabase = await createClient()
  const allowed = await canCreateAgent(supabase, userId)

  return (
    // The wash needs the full width of the card to spread across, so it sits
    // on the outer region while the content keeps its narrow column.
    <div className="relative flex flex-1 flex-col overflow-hidden px-4 py-16 sm:px-6 md:px-8">
      <AmbientBackdrop />
      <div className="run-hero relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
      {/* No mark here. The greeting opens the screen instead: the sidebar
          already carries the brand two inches away, and a logo above a line
          that says your name made the page read as a splash screen. */}
      <Greeting name={firstName(profile?.display_name)} />
      {/* The sentence is spoken once, as a fixed string. The visible version
          is the same words with one of them cycling, which is decoration and
          is hidden from assistive technology inside FlipWord. */}
      {/* Hero sizing: the home screen is the one sanctioned exception to the
          24px page-title cap. Every size on this screen is local to these two
          home components, so nothing else inherits it. */}
      {/* 7% under text-3xl/4xl, set by the founder's eye. */}
      {/* Paired with the composer, not floating above it: the chips sit 20px
          under the box, so the headline sits a comparable distance over it. */}
      <h1 className="run-rise run-hero-dim mb-6 text-balance text-[24px]/8 font-semibold tracking-tight [--rise-delay:90ms] sm:text-[28px]/9 md:text-[33px]/10">
        <span className="sr-only">
          Put an agent on your inbox, drafts, reading or research.
        </span>
        <span aria-hidden>
          Put an agent on your <FlipWord words={AGENT_KINDS} />
        </span>
      </h1>

      {error && (
        <p className="mb-4 w-full rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-center text-sm text-destructive">
          {error}
        </p>
      )}

        <PromptComposer blockedReason={allowed.ok ? null : allowed.reason} />
      </div>
    </div>
  )
}
