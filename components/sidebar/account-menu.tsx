'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsUpDown, LogOut } from 'lucide-react'

import { logout } from '@/app/actions/auth'
import { SettingsIcon } from '@/components/nav-icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TruncatedLabel } from '@/components/ui/truncated-label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

// Everything about the person sits behind their own face: their profile, and
// signing out. Knowledge and Connectors stay in the nav above because those
// belong to the agents, not to the account.
//
// Split out of the sidebar shell so the profile read can stream in rather than
// holding up the whole frame. Still a client component: the dropdown is
// interactive and the active state depends on the path.
export function AccountMenu({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string
  email: string
  avatarUrl: string | null
}) {
  const pathname = usePathname()
  const name = displayName || email
  const initials = name.slice(0, 2).toUpperCase()

  return (
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
            <div className="run-rail-fade flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0">
              <TruncatedLabel text={name} className="text-sm font-medium" />
              {/* Everyone has their own space, so there is no member or
                  administrator rank to show. The account it belongs to is
                  the useful line. */}
              <TruncatedLabel
                text={email}
                className="text-xs text-muted-foreground"
              />
            </div>
            <ChevronsUpDown className="run-rail-fade ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0" />
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
  )
}
