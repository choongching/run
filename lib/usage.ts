import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  UsageEventType,
  UsageSource,
  UsageStatus,
} from '@/lib/types/database'

// Server-side only. Usage rows are written with the service-role key
// (usage_events has no insert policy on purpose), fire-and-forget: call as
// `void recordUsage(...)`, never await it on the request path.

// Public per-MTok list rates. Costs recorded here are ESTIMATES, not a bill:
// they price what the model reported at published rates and ignore anything
// we cannot see, so treat them as a signal about a workload, never as the
// number a customer is charged.
//
// Unknown models fall back to the default so recording never fails.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-opus-4-8': { input: 5.0, output: 25.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
}
const DEFAULT_PRICING = { input: 3.0, output: 15.0 }

// Cache tokens are priced off the model's own input rate: reading the cache is
// a tenth of it, writing it costs a quarter more than sending the text plain.
// That is why they are counted apart from input_tokens rather than added to
// it, and why pricing them as input would overstate a cached session tenfold.
const CACHE_READ_RATE = 0.1
const CACHE_WRITE_RATE = 1.25

// Some call sites pass a dated snapshot id (the naming model is pinned to
// claude-haiku-4-5-20251001). Match the family so a pinned model is not priced
// at the fallback rate, which for Haiku would be triple.
function priceFor(model: string) {
  if (PRICING[model]) return PRICING[model]
  const family = Object.keys(PRICING).find((id) => model.startsWith(id))
  return family ? PRICING[family] : DEFAULT_PRICING
}

export type TokenCounts = {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens?: number
  cacheReadInputTokens?: number
}

export function computeCost(model: string, tokens: TokenCounts): number {
  const price = priceFor(model)
  const cacheWrite = tokens.cacheCreationInputTokens ?? 0
  const cacheRead = tokens.cacheReadInputTokens ?? 0
  const inputCost =
    (tokens.inputTokens +
      cacheWrite * CACHE_WRITE_RATE +
      cacheRead * CACHE_READ_RATE) *
    price.input
  return (inputCost + tokens.outputTokens * price.output) / 1_000_000
}

// One page of a person's run history, newest first.
//
// Takes the caller's own Supabase client, not the service-role one: the table
// already has a policy saying you may read your own rows, so the list is
// scoped by RLS rather than by a filter someone could forget to write.
//
// Paginated by timestamp rather than offset. A history grows at the top, and
// an offset would skip or repeat rows as it does.
export type RunHistoryEntry = {
  id: string
  createdAt: string
  agentId: string | null
  agentName: string | null
  threadId: string | null
  source: UsageSource
  status: UsageStatus
  costUsd: number
}

export async function listRunHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
  opts: { limit?: number; before?: string } = {}
): Promise<RunHistoryEntry[]> {
  let query = supabase
    .from('usage_events')
    .select(
      'id, created_at, agent_id, agent_name, thread_id, source, status, cost_usd'
    )
    .eq('user_id', userId)
    // A person's history is the work they asked for. What we spend naming
    // their agent is ours to know and not theirs to read as an entry.
    .eq('event_type', 'mission_run')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50)

  if (opts.before) query = query.lt('created_at', opts.before)

  const { data, error } = await query
  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    agentId: row.agent_id,
    agentName: row.agent_name,
    threadId: row.thread_id,
    source: row.source,
    status: row.status,
    costUsd: row.cost_usd,
  }))
}

// The month's spend grouped by agent, biggest first: the answer to "where
// did my month go". Aggregated here rather than in the client because the
// history list is paginated and a page cannot count a month. The month is
// bounded by the plan's run limit, so reading the slim columns and counting
// in memory stays small by construction.
export type AgentSpend = {
  agentId: string | null
  agentName: string | null
  count: number
}

export async function monthByAgent(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AgentSpend[]> {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('usage_events')
    .select('agent_id, agent_name')
    .eq('user_id', userId)
    .eq('event_type', 'mission_run')
    .eq('status', 'completed')
    .gte('created_at', monthStart.toISOString())
    // Oldest first, so the "latest name wins" pass below is actually true.
    .order('created_at', { ascending: true })
  if (error || !data) return []

  const totals = new Map<string, AgentSpend>()
  for (const row of data) {
    const key = row.agent_id ?? 'deleted'
    const entry = totals.get(key)
    if (entry) {
      entry.count += 1
      // A rename keeps the latest name for the whole group.
      if (row.agent_name) entry.agentName = row.agent_name
    } else {
      totals.set(key, {
        agentId: row.agent_id,
        agentName: row.agent_name,
        count: 1,
      })
    }
  }
  return [...totals.values()].sort((a, b) => b.count - a.count)
}

export async function recordUsage(
  params: {
    userId: string
    agentId?: string | null
    threadId?: string | null
    model: string
    eventType: UsageEventType
    source?: UsageSource
    status?: UsageStatus
  } & TokenCounts
): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return

    const supabase = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    })

    // The row keeps its own copy of the agent's name so the history survives
    // the agent being deleted. Resolved here rather than asked of every caller:
    // six of them exist, two do not load the name, and a caller that forgets
    // would leave a hole in the ledger that cannot be filled in later.
    let agentName: string | null = null
    if (params.agentId) {
      const { data } = await supabase
        .from('agents')
        .select('name')
        .eq('id', params.agentId)
        .maybeSingle()
      agentName = data?.name ?? null
    }

    const { error } = await supabase.from('usage_events').insert({
      user_id: params.userId,
      agent_id: params.agentId ?? null,
      agent_name: agentName,
      thread_id: params.threadId ?? null,
      source: params.source ?? 'chat',
      status: params.status ?? 'completed',
      model: params.model,
      input_tokens: params.inputTokens,
      cache_creation_input_tokens: params.cacheCreationInputTokens ?? 0,
      cache_read_input_tokens: params.cacheReadInputTokens ?? 0,
      output_tokens: params.outputTokens,
      cost_usd: computeCost(params.model, params),
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
