import { getUserProfile } from '@/lib/auth'
import { parseEnabledTools } from '@/lib/agents/config'
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

  // Runnable agents are every active agent the caller can see: their own,
  // company-visible ones, and ones shared to them. Agents RLS scopes this.
  const [{ data: missions }, { data: agentRows }] = await Promise.all([
    supabase
      .from('missions')
      .select('*, agents(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('agents')
      .select('id, name, description, enabled_tools, default_output_type')
      .eq('status', 'active')
      .order('name'),
  ])

  const agents: SquadAgent[] = (agentRows ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    web_search_allowed: parseEnabledTools(a.enabled_tools).web_search,
    default_output_type: a.default_output_type,
  }))

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
