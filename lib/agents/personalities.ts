// Plain-language personality presets for an agent's voice. Each maps to a short
// clause folded into the system prompt (see buildSystemPrompt). Kept in its own
// module with no SDK imports so both the client config panel and the server
// prompt composer can use it without bundling the Anthropic SDK into the client.

export type PersonalityId = 'balanced' | 'warm' | 'direct' | 'concise' | 'sassy'

export const DEFAULT_PERSONALITY: PersonalityId = 'balanced'

export const PERSONALITIES: {
  id: PersonalityId
  label: string
  description: string
  // The voice instruction added to the system prompt. Balanced is the default
  // voice and adds nothing.
  clause: string
}[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Balanced, thoughtful, and clear.',
    clause: '',
  },
  {
    id: 'warm',
    label: 'Warm',
    description: 'Encouraging, friendly, and reassuring.',
    clause: 'Speak warmly. Be encouraging, friendly, and reassuring.',
  },
  {
    id: 'direct',
    label: 'Direct',
    description: 'Straightforward, decisive, and efficient.',
    clause:
      'Speak directly. Be straightforward, decisive, and efficient, and skip filler.',
  },
  {
    id: 'concise',
    label: 'Concise',
    description: 'Minimal, high signal, and brief.',
    clause:
      'Keep replies minimal, high signal, and brief. Prefer short answers and tight lists.',
  },
  {
    id: 'sassy',
    label: 'Sassy',
    description: 'Playful, witty, and a little sharp.',
    clause:
      'Be playful, witty, and a little sharp, while staying genuinely helpful and kind.',
  },
]

export function isPersonality(id: string): id is PersonalityId {
  return PERSONALITIES.some((p) => p.id === id)
}

// The voice clause for a personality id, or empty string for balanced/unknown.
export function personalityClause(id: string | null | undefined): string {
  return PERSONALITIES.find((p) => p.id === id)?.clause ?? ''
}
