import { ChartNoAxesColumn } from 'lucide-react'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'

const EVENT_TYPE_LABEL: Record<string, string> = {
  mission_run: 'Mission run',
  prompt_generation: 'Prompt writing',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function formatCost(n: number): string {
  return `$${n.toFixed(n >= 1 ? 2 : 4)}`
}

export default async function UsagePage() {
  const { userId, profile } = await getUserProfile()
  const isAdmin = profile?.role === 'admin'
  const supabase = await createClient()

  // RLS already scopes reads (admins see all, users see their own); the
  // explicit filter for members just makes the intent visible.
  let query = supabase
    .from('usage_events')
    .select('*, profiles(display_name), agents(name)')
    .order('created_at', { ascending: false })
  if (!isAdmin) query = query.eq('user_id', userId)
  const { data: events } = await query

  const all = events ?? []
  const missionRuns = all.filter((e) => e.event_type === 'mission_run').length
  const totalIn = all.reduce((sum, e) => sum + e.input_tokens, 0)
  const totalOut = all.reduce((sum, e) => sum + e.output_tokens, 0)
  const totalCost = all.reduce((sum, e) => sum + Number(e.cost_usd), 0)
  const recent = all.slice(0, 50)

  const stats: { label: string; value: string; caption?: string }[] = [
    { label: 'Mission runs', value: String(missionRuns) },
    {
      label: 'Tokens used',
      value: formatTokens(totalIn + totalOut),
      caption: `${formatTokens(totalIn)} in, ${formatTokens(totalOut)} out`,
    },
    { label: 'Estimated cost', value: formatCost(totalCost) },
  ]

  return (
    <>
      <PageHeader
        title="Usage"
        description={
          isAdmin
            ? 'Token usage and estimated cost across the whole company'
            : 'Your token usage and estimated cost'
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5 shadow-xs"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1.5 text-2xl font-semibold">{stat.value}</p>
            {stat.caption && (
              <p className="mt-1 text-xs text-muted-foreground">{stat.caption}</p>
            )}
          </div>
        ))}
      </div>

      {all.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-border bg-card py-14 text-center shadow-xs">
          <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-background shadow-xs">
            <ChartNoAxesColumn className="size-5 stroke-[1.75] text-muted-foreground" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">No usage yet</h2>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
            {isAdmin
              ? 'Every mission run and AI prompt writing session lands here, with token counts and what it roughly cost.'
              : 'Run your first mission and its token usage shows up here.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <p className="text-sm font-medium">
              {all.length} event{all.length === 1 ? '' : 's'}
            </p>
            {all.length > recent.length && (
              <p className="text-sm text-muted-foreground">
                showing the latest {recent.length}
              </p>
            )}
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  {isAdmin && <th className="px-4 py-3 font-semibold">User</th>}
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Activity</th>
                  <th className="px-4 py-3 text-right font-semibold">Tokens in</th>
                  <th className="px-4 py-3 text-right font-semibold">Tokens out</th>
                  <th className="px-4 py-3 text-right font-semibold">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {event.created_at.slice(0, 10).replaceAll('-', '/')}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {event.profiles?.display_name ?? 'Unknown user'}
                      </td>
                    )}
                    <td className="px-4 py-3">{event.agents?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {event.input_tokens.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {event.output_tokens.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCost(Number(event.cost_usd))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Costs are estimates based on public per-token rates, not your
            actual bill.
          </p>
        </>
      )}
    </>
  )
}
