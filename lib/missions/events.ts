import type { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/database'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// Tool results and thinking blocks can be huge; the timeline only ever shows
// a preview, so cap every string before it reaches the database.
const MAX_STRING = 4000

function trim(value: unknown): Json {
  if (typeof value === 'string') {
    return value.length > MAX_STRING
      ? `${value.slice(0, MAX_STRING)}… [truncated]`
      : value
  }
  if (Array.isArray(value)) return value.map(trim)
  if (value && typeof value === 'object') {
    const out: { [key: string]: Json } = {}
    for (const [k, v] of Object.entries(value)) out[k] = trim(v)
    return out
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value
  }
  return null
}

// Append one event to the mission's timeline. Never throws: a lost timeline
// row must not fail a run. Inserts are awaited by callers so row order (the
// timeline's ordering key) follows event order.
export async function recordMissionEvent(
  supabase: SupabaseServerClient,
  missionId: string,
  eventType: string,
  payload: unknown
): Promise<void> {
  try {
    await supabase.from('mission_events').insert({
      mission_id: missionId,
      event_type: eventType,
      payload: trim(payload ?? {}),
    })
  } catch {
    // Timeline is best-effort; the run itself is the source of truth.
  }
}
