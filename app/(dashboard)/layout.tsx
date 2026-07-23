import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { SquadMember } from '@/components/squad/agent-personalise-drawer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, email, profile } = await getUserProfile()
  const supabase = await createClient()

  const { data: squadRows } = await supabase
    .from('user_agents')
    .select('agent_id, custom_instructions, agents!inner(name, description, status)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('agents.status', 'active')

  const squad: SquadMember[] = (squadRows ?? [])
    .map((row) => ({
      agent_id: row.agent_id,
      name: row.agents?.name ?? 'Unknown agent',
      description: row.agents?.description ?? null,
      custom_instructions: row.custom_instructions,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <SidebarProvider>
      <AppSidebar
        role={profile?.role ?? 'user'}
        displayName={profile?.display_name ?? ''}
        email={email}
        avatarUrl={profile?.avatar_url ?? null}
        squad={squad}
      />
      <SidebarInset>
        <div className="flex flex-1 flex-col p-6 md:p-8">
          <SidebarTrigger className="mb-4 md:hidden" />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
