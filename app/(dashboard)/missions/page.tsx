import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { MissionsBoard } from '@/components/missions/missions-board'
import type {
  MissionWithAgent,
  SquadAgent,
} from '@/components/missions/mission-status'

export default async function MissionsPage() {
  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const [{ data: missions }, { data: squadRows }] = await Promise.all([
    supabase
      .from('missions')
      .select('*, agents(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_agents')
      .select('agents!inner(id, name, description, status)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('agents.status', 'active'),
  ])

  const agents: SquadAgent[] = (squadRows ?? [])
    .map((row) => row.agents)
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => ({ id: a.id, name: a.name, description: a.description }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader
        title="Missions"
        description="Brief your agents and track their work from queued to done"
      />
      <MissionsBoard
        initialMissions={(missions ?? []) as MissionWithAgent[]}
        agents={agents}
      />
    </>
  )
}
