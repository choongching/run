import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json, Routine } from '@/lib/types/database'
import {
  nextOccurrences,
  validateRule,
  type RoutineRule,
} from '@/lib/routines/rule'

// Everything a routine needs at birth. The rule may arrive without an anchor
// or timezone: the agent proposing a routine in chat knows neither, so the
// server stamps them here (anchor = today in the person's zone, tz = what the
// browser reported when they confirmed).
export type NewRoutine = {
  agentId: string
  name: string
  instruction: string
  rule: Omit<RoutineRule, 'anchor' | 'tz'> & { anchor?: string; tz?: string }
  tz: string
}

export type CreateResult =
  | { ok: true; routine: Routine; firstRuns: Date[] }
  | { ok: false; reason: string }

const MAX_NAME = 80
const MAX_INSTRUCTION = 4000

// Today's date (YYYY-MM-DD) on the wall clock of a zone.
function todayIn(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// Create a routine through the caller's own client, so RLS is the authority
// on who may put a routine on which agent (insert requires ownership of the
// agent, not just a matching user_id).
export async function createRoutine(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: NewRoutine
): Promise<CreateResult> {
  const name = input.name?.trim().slice(0, MAX_NAME)
  const instruction = input.instruction?.trim().slice(0, MAX_INSTRUCTION)
  if (!name) return { ok: false, reason: 'The routine needs a name.' }
  if (!instruction)
    return { ok: false, reason: 'Say what the routine should do each time.' }

  const tz = input.rule.tz ?? input.tz
  if (!tz) return { ok: false, reason: 'No timezone came through.' }
  const rule: RoutineRule = {
    ...input.rule,
    tz,
    anchor: input.rule.anchor ?? todayIn(tz),
  }
  const invalid = validateRule(rule)
  if (invalid) return { ok: false, reason: invalid }

  const firstRuns = nextOccurrences(rule, new Date(), 3)
  if (firstRuns.length === 0)
    return { ok: false, reason: 'That schedule never fires.' }

  const { data, error } = await supabase
    .from('routines')
    .insert({
      agent_id: input.agentId,
      user_id: userId,
      name,
      instruction,
      rule: rule as unknown as Json,
      next_run_at: firstRuns[0].toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, reason: 'The routine could not be saved.' }
  }
  return { ok: true, routine: data, firstRuns }
}
