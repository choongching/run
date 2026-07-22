import Anthropic from '@anthropic-ai/sdk'

// Server-side only. Never import from client components.
let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return client
}

export const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01'

// Models offered in the agent form. First entry is the default for new agents.
export const AGENT_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
] as const

export const DEFAULT_AGENT_MODEL = AGENT_MODELS[0].id

// Every Claude agent gets the full toolset so mission sessions can read
// mounted knowledge files, run bash, and search the web (Phases 4-5).
export const AGENT_TOOLSET = [
  {
    type: 'agent_toolset_20260401' as const,
    default_config: { enabled: true },
  },
]
