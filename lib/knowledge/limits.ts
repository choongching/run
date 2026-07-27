// The rules for always-on knowledge. Client-safe (no server imports) so the
// config panel, the server actions, and the prompt composer all size things the
// same way.
//
// Every limit here follows from one fact: a tier-1 source is composed into the
// agent's system prompt, so it is re-sent on EVERY turn. The cost is per turn,
// not per upload, which is why the caps are about characters kept rather than
// bytes stored. Large corpora belong in tier-2 retrieval, not here.

// One always-on source, reduced to what composing a prompt needs. Declared here
// (not in the prompt composer) so the loader and the composer can share it
// without importing each other.
export type KnowledgeInput = { title: string; content: string }

// Roughly 5k tokens: comfortably more than a voice guide, style sheet, or
// glossary needs, and small enough that one source cannot dominate a turn.
export const MAX_SOURCE_CHARS = 20_000

// Roughly 10k tokens of always-on context per agent.
export const MAX_AGENT_CHARS = 40_000

// Keeps the library and the attached list scannable, and is a backstop against
// a runaway upload loop.
export const MAX_LIBRARY_SOURCES = 50
export const MAX_SOURCES_PER_AGENT = 12

// Knowledge is text the agent always carries, so images are not eligible: there
// is nothing to keep. Documents only, same ceiling as a chat upload.
export const KNOWLEDGE_ACCEPT_ATTR = '.pdf,.docx,.txt,.md,.csv'
export const KNOWLEDGE_ACCEPTED_HINT = 'PDF, Word, text, Markdown, or CSV'

// Share of the per-agent budget a set of sources uses, 0 to 1 (can exceed 1
// only if a cap were bypassed; callers clamp for display).
export function budgetFraction(chars: number): number {
  return chars / MAX_AGENT_CHARS
}

// "2,400 of 40,000 characters" reads as jargon; this says the same thing the
// way the meter should be read.
export function budgetLabel(chars: number): string {
  const pct = Math.round(budgetFraction(chars) * 100)
  return `${pct}% of this agent's knowledge space used`
}

// Trim one source's text to the per-source cap, flagging whether it was cut so
// the UI can say so rather than quietly keeping a fraction.
export function trimToSourceCap(text: string): {
  text: string
  chars: number
  truncated: boolean
} {
  const clean = text.trim()
  if (clean.length <= MAX_SOURCE_CHARS) {
    return { text: clean, chars: clean.length, truncated: false }
  }
  const cut = clean.slice(0, MAX_SOURCE_CHARS)
  return { text: cut, chars: cut.length, truncated: true }
}

// Why an attach was refused, in the user's terms. Null means it is allowed.
export function attachRefusal(opts: {
  attachedChars: number
  attachedCount: number
  incomingChars: number
}): string | null {
  if (opts.attachedCount >= MAX_SOURCES_PER_AGENT) {
    return `This agent already has ${MAX_SOURCES_PER_AGENT} sources attached. Detach one to add another.`
  }
  if (opts.attachedChars + opts.incomingChars > MAX_AGENT_CHARS) {
    return "This would go past the agent's knowledge space. Detach something first, or shorten this source."
  }
  return null
}
