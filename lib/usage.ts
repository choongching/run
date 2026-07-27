import { createClient } from '@supabase/supabase-js'
import type { Database, UsageEventType } from '@/lib/types/database'

// Server-side only. Usage rows are written with the service-role key
// (usage_events has no insert policy on purpose), fire-and-forget: call as
// `void recordUsage(...)`, never await it on the request path.

// Public per-MTok rates, used for ESTIMATED costs in the Usage page.
// Unknown models fall back to the default so recording never fails.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-opus-4-8': { input: 5.0, output: 25.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
}
const DEFAULT_PRICING = { input: 3.0, output: 15.0 }

export function computeCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const price = PRICING[model] ?? DEFAULT_PRICING
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000
}

export async function recordUsage(params: {
  userId: string
  agentId?: string | null
  model: string
  inputTokens: number
  outputTokens: number
  eventType: UsageEventType
}): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return

    const supabase = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    })
    const { error } = await supabase.from('usage_events').insert({
      user_id: params.userId,
      agent_id: params.agentId ?? null,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_usd: computeCost(params.model, params.inputTokens, params.outputTokens),
      event_type: params.eventType,
    })
    if (error) {
      console.error('recordUsage insert failed:', error.message)
    }
  } catch (err) {
    // Usage tracking must never break the request that triggered it.
    console.error('recordUsage failed:', err)
  }
}
