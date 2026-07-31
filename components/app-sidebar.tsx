'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'

import { ConnectorsIcon, KnowledgeIcon } from '@/components/nav-icons'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'

export type { SidebarAgent } from '@/components/sidebar/agent-list'

// The sidebar frame and everything in it that needs no data: the logo, New
// agent, Knowledge, Connectors. It renders immediately.
//
// The three parts that DO need data arrive as slots, each wrapped in its own
// Suspense boundary by the layout. This is the difference between a shell that
// paints in milliseconds and one that waits on the slowest query before showing
// anything at all. Nav is the thing a person reaches for first, so it should
// never be held up by a usage count.
export function AppSidebar({
  agentSlot,
  meterSlot,
  accountSlot,
}: {
  agentSlot: React.ReactNode
  meterSlot: React.ReactNode
  accountSlot: React.ReactNode
}) {
  const pathname = usePathname()

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
                  className="min-h-11 md:min-h-0"
                >
                  <Plus className="size-4.5 shrink-0" />
                  <span className="font-medium">New agent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {agentSlot}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Fetched before it is clicked, so the page is already in the
                browser by then. Only these two: their data is small, stable,
                and invalidated whenever it changes. A chat is none of those
                things, and prefetching one would cache a message list that
                goes out of date the moment the next reply lands. */}
            <SidebarMenuButton
              isActive={pathname.startsWith('/knowledge')}
              render={<Link href="/knowledge" prefetch />}
              className="min-h-11 md:min-h-0"
            >
              <KnowledgeIcon className="size-4.5 shrink-0" />
              <span>Knowledge</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/connectors')}
              render={<Link href="/connectors" prefetch />}
              className="min-h-11 md:min-h-0"
            >
              <ConnectorsIcon className="size-4.5 shrink-0" />
              <span>Connectors</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        {/* The meter sits with the account rather than in the nav: what is
            left this month belongs to the person, the way their plan does,
            not to any one agent. */}
        {meterSlot}
        {accountSlot}
      </SidebarFooter>
    </Sidebar>
  )
}
