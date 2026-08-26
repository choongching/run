'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'

import { ConnectorsIcon, KnowledgeIcon, RoutinesIcon } from '@/components/nav-icons'
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
  SidebarTrigger,
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
  routinesBadgeSlot,
}: {
  agentSlot: React.ReactNode
  meterSlot: React.ReactNode
  accountSlot: React.ReactNode
  routinesBadgeSlot: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    // collapsible="icon" rather than the default offcanvas: on a desktop the
    // rail can now shrink to a 48px strip of icons instead of only being able
    // to disappear. The choice is kept in a cookie and read by the layout, so
    // the server renders whichever one you left it in.
    //
    // Mobile is untouched by this. Below md the rail is still a drawer that
    // slides over the page, which is the only thing that works on a phone.
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          {/* Expanded: the mark, the wordmark, and the collapse control at the
              trailing edge, which is where all four of the products we looked
              at put it. Collapsed, there is no room for two things on a 48px
              row, so the control moves to its own row underneath, and the
              mark keeps the top spot. */}
          <SidebarMenuItem className="flex items-center gap-1">
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              className="min-w-0 flex-1"
            >
              <Image src="/run-icon.png" alt="" width={28} height={28} />
              <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">
                Run
              </span>
            </SidebarMenuButton>
            <SidebarTrigger
              aria-label="Collapse the sidebar"
              className="shrink-0 max-md:hidden group-data-[collapsible=icon]:hidden"
            />
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden justify-center group-data-[collapsible=icon]:flex">
            <SidebarTrigger aria-label="Expand the sidebar" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {/* The one row in the rail that does something rather than
                    going somewhere, and it now says so. A solid primary ROW
                    was tried once and reverted the same evening (founder's
                    call): the filled block crowded the rail more than it
                    invited. Filling the icon instead is the version Town
                    uses, and it marks the action without spending the width.

                    The size and colour overrides are deliberate: the menu
                    button sets every icon inside it to 18px muted, which is
                    right for a destination and wrong for a filled mark. */}
                <SidebarMenuButton
                  isActive={pathname === '/'}
                  tooltip="New agent"
                  render={<Link href="/" />}
                  className="min-h-11 md:min-h-0"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary [&_svg]:size-3! [&_svg]:text-primary-foreground!">
                    <Plus strokeWidth={2.5} />
                  </span>
                  <span className="font-medium">New agent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Directly under the create action, above the agent list,
                  because it is the only row in the rail that can report a
                  state: the badge says how many routines are waiting on the
                  person. Agents is a list of conversations; Knowledge and
                  Connectors are cupboards. */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith('/routines')}
                  tooltip="Routines"
                  render={<Link href="/routines" prefetch />}
                  className="min-h-11 md:min-h-0"
                >
                  <RoutinesIcon className="size-4.5 shrink-0" />
                  <span>Routines</span>
                </SidebarMenuButton>
                {routinesBadgeSlot}
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
              tooltip="Knowledge"
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
              tooltip="Connectors"
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
