import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { SidebarAgent } from '@/components/app-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, email, profile } = await getUserProfile()
  const supabase = await createClient()

  // The sidebar is the user's list of agents (each an ongoing chat). v1 shows
  // the agents they own; RLS scopes the read regardless.
  const { data: agentRows } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('owner_id', userId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  const agents: SidebarAgent[] = (agentRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }))

  return (
    <SidebarProvider>
      <AppSidebar
        displayName={profile?.display_name ?? ''}
        email={email}
        avatarUrl={profile?.avatar_url ?? null}
        agents={agents}
      />
      <SidebarInset>
        {/* The scroll container for page content. Normal pages scroll here;
            the chat page fills this height and scrolls only its message list,
            keeping its header and composer pinned. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 md:p-8">
          <SidebarTrigger className="mb-4 md:hidden" />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
