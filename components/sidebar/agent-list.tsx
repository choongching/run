'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { AgentsIcon } from '@/components/nav-icons'
import { TruncatedLabel } from '@/components/ui/truncated-label'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export type SidebarAgent = {
  id: string
  name: string
}

// The agent list, split out of the sidebar shell so it can stream in on its
// own. It stays a client component because which row is active depends on the
// current path.
export function AgentList({ agents }: { agents: SidebarAgent[] }) {
  const pathname = usePathname()

  if (agents.length === 0) return null

  return (
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
                <TruncatedLabel text={agent.name} />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
