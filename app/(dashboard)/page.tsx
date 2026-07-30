import Image from 'next/image'

import { AmbientBackdrop } from '@/components/home/ambient-backdrop'
import { FlipWord } from '@/components/home/flip-word'
import { PromptComposer } from '@/components/home/prompt-composer'
import { getUserIdentity } from '@/lib/auth'
import { canCreateAgent } from '@/lib/entitlements/assert'
import { createClient } from '@/lib/supabase/server'

// What the headline cycles through. Only things Run can actually do today:
// it reads Gmail and Drive and searches the web, so the list stays inside
// that. Promising a kind of agent the product cannot build is a worse first
// impression than a shorter list.
const AGENT_KINDS = ['inbox.', 'drafts.', 'writing.', 'research.'] as const

// The prompt-first home: one line, one box, a few seeds. Submitting creates an
// agent and opens its chat.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { userId } = await getUserIdentity()
  const { error } = await searchParams

  // Ask the same helper the server action asks, so the box is only enabled
  // when submitting it would actually work.
  const supabase = await createClient()
  const allowed = await canCreateAgent(supabase, userId)

  return (
    // The wash needs the full width of the card to spread across, so it sits
    // on the outer region while the content keeps its narrow column.
    <div className="relative flex flex-1 flex-col overflow-hidden px-6 py-16 md:px-8">
      <AmbientBackdrop />
      <div className="run-hero relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
      {/* priority: this is the first thing the entrance reveals, and a
          lazy-loaded mark would fade in as an empty box on a cold visit. */}
      <Image src="/run-icon.png" alt="" width={56} height={56} priority className="run-rise run-hero-dim mb-7" />
      {/* The sentence is spoken once, as a fixed string. The visible version
          is the same words with one of them cycling, which is decoration and
          is hidden from assistive technology inside FlipWord. */}
      {/* Hero sizing: the home screen is the one sanctioned exception to the
          24px page-title cap. Every size on this screen is local to these two
          home components, so nothing else inherits it. */}
      {/* 7% under text-3xl/4xl, set by the founder's eye. */}
      <h1 className="run-rise run-hero-dim mb-10 text-[28px]/9 font-semibold tracking-tight [--rise-delay:90ms] md:text-[33px]/10">
        <span className="sr-only">
          Build an agent for your inbox, drafts, writing or research.
        </span>
        <span aria-hidden>
          Build an agent for your <FlipWord words={AGENT_KINDS} />
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
