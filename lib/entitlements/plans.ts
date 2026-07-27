// What a plan lets you do.
//
// Client-safe (no server imports) so the server check and the disabled state in
// the UI read the same numbers instead of drifting apart.
//
// This is the seam that replaces role gating. A role is a wall you rebuild per
// feature; a limit is a dial you turn. Nothing here asks who you are, only what
// your plan allows, so a feature can be widened, tightened, or sold without
// touching authorization.
//
// Plans are a constant for now. When spaces land, this table moves into the
// database keyed by workspace and the shape stays the same. The knowledge caps
// in lib/knowledge/limits.ts belong here too, but they ship as fixed product
// limits today and moving them is a behavior change, so they stay put until
// plans are real.

export type PlanId = 'free' | 'pro'

export type Plan = {
  id: PlanId
  label: string
  limits: {
    // How many agents the user may have at once.
    agents: number
  }
}

export const PLANS: Record<PlanId, Plan> = {
  free: { id: 'free', label: 'Free', limits: { agents: 2 } },
  pro: { id: 'pro', label: 'Pro', limits: { agents: 20 } },
}

// Everyone is on Free until billing exists. One place to change when it does.
export const DEFAULT_PLAN: PlanId = 'free'

export function planFor(id: string | null | undefined): Plan {
  return PLANS[(id ?? DEFAULT_PLAN) as PlanId] ?? PLANS[DEFAULT_PLAN]
}

// The sentence shown when a limit stops someone. Written as a fact plus a way
// forward, never as a scolding, and never mentioning a "plan" the product
// cannot yet sell.
export function agentLimitReason(limit: number): string {
  return `You can have ${limit} agents at the moment. Delete one to make room for another.`
}
