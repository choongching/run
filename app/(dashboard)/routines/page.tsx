import { PageHeader } from '@/components/page-header'
import { PageShell } from '@/components/page-shell'
import { RoutinesList } from '@/components/routines/routines-list'
import { getUserIdentity } from '@/lib/auth'
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
  const [routines, { data: agents }] = await Promise.all([
    listRoutines(supabase, userId),
    supabase
      .from('agents')
      .select('id, name')
      .eq('owner_id', userId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(1),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Routines"
        description="Work your agents do on their own, on a schedule you set."
      />
      <RoutinesList routines={routines} firstAgent={agents?.[0] ?? null} />
    </PageShell>
  )
}
