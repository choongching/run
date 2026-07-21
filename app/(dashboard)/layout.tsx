import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { getUserProfile } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { email, profile } = await getUserProfile()

  return (
    <SidebarProvider>
      <AppSidebar
        role={profile?.role ?? 'user'}
        displayName={profile?.display_name ?? ''}
        email={email}
        avatarUrl={profile?.avatar_url ?? null}
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
