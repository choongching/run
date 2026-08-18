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

// A small, fast model used for utility calls that are not the agent itself,
// like naming a new agent from its first prompt.
export const NAMING_MODEL = 'claude-haiku-4-5-20251001'

// Every Claude agent gets the toolset so mission sessions can read mounted
// knowledge files and run bash. Per-tool `enabled: false` is hard enforcement
// by the API (verified live, docs/capability-matrix-2026-07-25.md).
//
// Search and fetch are SEPARATE flags, and the split is load-bearing in two
// directions. When our own search tool is attached, the built-in search must be
// off or the model simply uses the one it already knows and the swap proves
// nothing (observed live, 2026-08-18: three searches, all of them the built-in).
// And reading a page must survive search being off, because a user pasting a
// URL is asking for a read, not a search.
export function buildAgentToolset(tools: { search: boolean; fetch: boolean }) {
  return [
    {
      type: 'agent_toolset_20260401' as const,
      default_config: { enabled: true },
      configs: [
        { name: 'web_search' as const, enabled: tools.search },
        { name: 'web_fetch' as const, enabled: tools.fetch },
      ],
    },
  ]
}

// The toolset for one session: the agent's own ceiling, minus the built-in
// search when this user's searches go through our provider instead.
//
// One helper because both session sites need the same three-way answer and a
// second copy of this reasoning is a second place to get it wrong.
export function toolsetFor(opts: {
  ceiling: { web_search: boolean }
  ourSearch: boolean
}) {
  return buildAgentToolset({
    search: opts.ceiling.web_search && !opts.ourSearch,
    fetch: opts.ceiling.web_search,
  })
}

// agents.enabled_tools is jsonb, so it arrives as unknown and may be null on a
// row written before the column existed. A missing or unreadable value means
// SEARCH IS ON: this is a ceiling, and the safe default for a ceiling is the
// behaviour the product already had. Turning it off by accident would silently
// break a news routine and look like the agent going quiet.
export function readToolCeiling(raw: unknown): { web_search: boolean } {
  const o = (raw ?? {}) as Record<string, unknown>
  return { web_search: o.web_search !== false }
}

export const AGENT_TOOLSET = buildAgentToolset({ search: true, fetch: true })
