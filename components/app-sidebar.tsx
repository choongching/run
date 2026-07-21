'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { logout } from '@/app/actions/auth'
import {
  AgentsIcon,
  CompanyIcon,
  IntegrationsIcon,
  MissionsIcon,
  SettingsIcon,
  UsageIcon,
  UsersIcon,
} from '@/components/nav-icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import type { UserRole } from '@/lib/types/database'

const mainNav = [
  { href: '/missions', label: 'Missions', icon: MissionsIcon },
  { href: '/usage', label: 'Usage', icon: UsageIcon },
]

const adminNav = [
  { href: '/admin/agents', label: 'Agents', icon: AgentsIcon },
  { href: '/admin/company', label: 'Company', icon: CompanyIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/integrations', label: 'Integrations', icon: IntegrationsIcon },
]

type AppSidebarProps = {
  role: UserRole
  displayName: string
  email: string
  avatarUrl: string | null
}

export function AppSidebar({ role, displayName, email, avatarUrl }: AppSidebarProps) {
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
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="size-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="size-4.5 shrink-0" />
                      <span>{item.label}</span>
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
              isActive={pathname === '/dashboard'}
              render={<Link href="/dashboard" />}
            >
              <SettingsIcon className="size-4.5 shrink-0" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="size-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className="bg-chart-3 text-xs font-medium text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {role === 'admin' ? 'Administrator' : 'Member'}
            </span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton render={<button type="submit" className="w-full" />}>
                <LogOut className="size-4.5 shrink-0" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
