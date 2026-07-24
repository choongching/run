import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { UsersTable } from '@/components/users/users-table'

export default async function UsersPage() {
  await requireAdminPage()
  const supabase = await createClient()

  const [{ data: profiles }, { data: agents }, { data: userAgents }] =
    await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('agents').select('*').eq('status', 'active').order('name'),
      supabase
        .from('user_agents')
        .select('user_id, agent_id')
        .eq('is_active', true),
    ])

  const assignments: Record<string, string[]> = {}
  for (const row of userAgents ?? []) {
    ;(assignments[row.user_id] ??= []).push(row.agent_id)
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage users and their agent assignments"
      />
      <UsersTable
        profiles={profiles ?? []}
        agents={agents ?? []}
        initialAssignments={assignments}
      />
    </>
  )
}
