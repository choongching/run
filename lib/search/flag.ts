// Who currently gets the web search tool.
//
// A staged rollout, not a feature flag system. `SEARCH_TOOL_USER_IDS` holds a
// comma-separated list of user ids; anyone not on it never sees the tool
// attached to their session and keeps Anthropic's built-in search exactly as
// before. Unset means nobody, which is the safe default for a deploy that lands
// before the env var does.
//
// Deliberately an env var rather than a database column: it is temporary. When
// the provider is proven on real runs, this file is deleted in one commit and
// nothing else changes. A flag that lives in the schema outlives its purpose.
//
// Server-only.
export function searchToolEnabledFor(userId: string): boolean {
  const raw = process.env.SEARCH_TOOL_USER_IDS
  if (!raw) return false
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId)
}

// Filter the tool list a session is created with. Applied at BOTH session
// sites, because `agent_with_overrides` replaces the tool set and a tool left
// in the array is a tool the model can call, whatever we intended.
//
// Typed structurally so this file does not import the tool definitions and drag
// server-only code somewhere it should not go.
export function withSearchTool<T extends { name: string }>(
  tools: T[],
  userId: string
): T[] {
  if (searchToolEnabledFor(userId)) return tools
  return tools.filter((tool) => tool.name !== 'search_web')
}
