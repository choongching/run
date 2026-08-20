import { PageHeader } from '@/components/page-header'
import { PageShell } from '@/components/page-shell'
import { RoutinesList } from '@/components/routines/routines-list'
import { getUserIdentity } from '@/lib/auth'
import { getRunAllowance } from '@/lib/entitlements/assert'
import { listRoutines } from '@/lib/routines/list'
import { createClient } from '@/lib/supabase/server'

// Everything an agent does on a schedule, in one place. The chat is where a
// routine is born; this page is where you live with six of them: what is
// armed, what is coming, and what quietly stopped working.
export default async function RoutinesPage() {
  const { userId } = await getUserIdentity()
  const supabase = await createClient()

  // The list, plus the person's agents for the empty state: a suggestion is
  // only useful if there is an agent to say it to.
  // The allowance rides along in the same round trip (an indexed count, and
  // the profile read is already memoised for this request), so the page pays
  // nothing extra for it.
  // Pairing rides along too: it is one primary-key lookup, and fetching it
  // here rather than from the sheet means the delivery switch never flashes
  // "not connected" at someone who is.
  const [routines, allowance, { data: agents }, { data: telegram }] = await Promise.all([
    listRoutines(supabase, userId),
    getRunAllowance(supabase, userId),
    supabase
      .from('agents')
      .select('id, name')
      .eq('owner_id', userId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase.from('user_telegram').select('user_id').eq('user_id', userId).maybeSingle(),
  ])

  return (
    <PageShell wide>
      <PageHeader
        title="Routines"
        description="Work your agents do on their own, on a schedule you set."
      />
      <RoutinesList
        routines={routines}
        firstAgent={agents?.[0] ?? null}
        runLimit={allowance.limit}
        telegramPaired={Boolean(telegram)}
      />
    </PageShell>
  )
}
