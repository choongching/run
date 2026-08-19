// Whether searches go through our own provider, and who that applies to.
//
// It applies to everyone, and the switch is not a list of user ids any more. It
// is a single deployment fact: is the platform search key configured here.
//
// That replaced a staged-rollout allowlist, and the reason is worth keeping.
// Flipping the built-in search off is the moment search can break, and it
// breaks in the one way nobody notices: the agent simply stops finding things.
// An allowlist could not protect against that, because the dangerous case is a
// deploy where the allowlist says yes and the key is absent. Reading the key
// itself cannot get that wrong. No key means our provider is not available
// here, so the built-in stays on and the product behaves exactly as it did
// before any of this work. Key present means our provider answers and the
// built-in is turned off, because attaching both leaves the model to choose and
// it chooses the one it was trained on.
//
// So a preview branch without the secret keeps working, a rollback keeps
// working, and forgetting to set the variable costs nothing but the saving.
//
// Server-only: it reads a secret's presence, and that is enough to keep out of
// a client bundle.
export function ourSearchEnabled(): boolean {
  return Boolean(process.env.BRAVE_API_KEY)
}

// Filter the tool list a session is created with. Applied at BOTH session
// sites, because `agent_with_overrides` replaces the tool set and a tool left
// in the array is a tool the model can call, whatever we intended.
//
// `enabled` is deliberately a value the caller computes rather than something
// read in here, because TWO things have to agree: our provider must be
// available at all, and this agent's own ceiling must allow search. Caught by a
// test: with the key set and an agent's search ceiling off, the built-in was
// correctly disabled while search_web stayed attached, which turned a switch
// that says "no searching" into one that only changes who we buy it from. No
// agent has the ceiling off today, so nothing was leaking; it was waiting to.
//
// Typed structurally so this file does not import the tool definitions and drag
// server-only code somewhere it should not go.
export function withSearchTool<T extends { name: string }>(
  tools: T[],
  enabled: boolean
): T[] {
  if (enabled) return tools
  return tools.filter((tool) => tool.name !== 'search_web')
}
