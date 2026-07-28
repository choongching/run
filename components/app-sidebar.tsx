'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsUpDown, LogOut, Plus } from 'lucide-react'

import { logout } from '@/app/actions/auth'
import {
  AgentsIcon,
  ConnectorsIcon,
  KnowledgeIcon,
  SettingsIcon,
} from '@/components/nav-icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'

export type SidebarAgent = {
  id: string
  name: string
}

type AppSidebarProps = {
  displayName: string
  email: string
  avatarUrl: string | null
  agents: SidebarAgent[]
}

export function AppSidebar({
  displayName,
  email,
  avatarUrl,
  agents,
}: AppSidebarProps) {
  const pathname = usePathname()
  const name = displayName || email
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <Image src="/run-icon.png" alt="" width={28} height={28} />
              <span className="text-base font-semibold">Run</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === '/'}
                  render={<Link href="/" />}
                >
                  <Plus className="size-4.5 shrink-0" />
                  <span className="font-medium">New agent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {agents.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Agents</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {agents.map((agent) => (
                  <SidebarMenuItem key={agent.id}>
                    <SidebarMenuButton
                      isActive={pathname === `/chat/${agent.id}`}
                      render={<Link href={`/chat/${agent.id}`} />}
                    >
                      <AgentsIcon className="size-4.5 shrink-0" />
                      <span className="truncate">{agent.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/knowledge')}
              render={<Link href="/knowledge" />}
            >
              <KnowledgeIcon className="size-4.5 shrink-0" />
              <span>Knowledge</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/connectors')}
              render={<Link href="/connectors" />}
            >
              <ConnectorsIcon className="size-4.5 shrink-0" />
              <span>Connectors</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        {/* Everything about the person sits behind their own face: their
            profile, and signing out. Knowledge and Connectors stay in the nav
            above because those belong to the agents, not to the account. */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    isActive={pathname.startsWith('/settings')}
                    aria-label="Account menu"
                  />
                }
              >
                <Avatar className="size-8">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                  <AvatarFallback className="bg-chart-3 text-xs font-medium text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{name}</span>
                  {/* Everyone has their own space, so there is no member or
                      administrator rank to show. The account it belongs to is
                      the useful line. */}
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <SettingsIcon className="size-4 shrink-0" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logout}>
                  {/* nativeButton keeps this a real submit button, which is
                      what actually posts the sign-out form. */}
                  <DropdownMenuItem
                    nativeButton
                    render={<button type="submit" className="w-full" />}
                  >
                    <LogOut className="size-4 shrink-0" />
                    Sign out
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
