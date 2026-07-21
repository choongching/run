import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { SquadEditor } from '@/components/users/squad-editor'

export default async function ManageUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPage()
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: agents }, { data: userAgents }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase.from('user_agents').select('agent_id').eq('user_id', id),
    ])

  if (!profile) notFound()

  return (
    <>
      <PageHeader
        title={profile.display_name ?? 'Unnamed user'}
        description="Assign agents to this user's squad"
      />
      <div className="max-w-3xl">
        <SquadEditor
          userId={profile.id}
          agents={agents ?? []}
          assignedAgentIds={(userAgents ?? []).map((row) => row.agent_id)}
        />
      </div>
    </>
  )
}
