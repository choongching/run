'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeft, Plus } from 'lucide-react'

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
  useSidebar,
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
// The collapsed rail's top row: the Run mark at rest, the panel icon under a
// pointer or a focus ring. SidebarTrigger renders its own icon and ignores
// children, so this reaches for the same hook it does rather than wrapping it.
//
// The swap is on focus-visible as well as hover on purpose. A control that
// only exists under a mouse is a control a keyboard cannot find, and this one
// is the only way back to a labelled rail.
function BrandToggle() {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Expand the sidebar"
      className="group/brand run-focus-fade flex size-8 items-center justify-center rounded-lg outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <Image
        src="/run-icon.png"
        alt=""
        width={28}
        height={28}
        className="size-[22px] max-w-none shrink-0 group-hover/brand:hidden group-focus-visible/brand:hidden"
      />
      <PanelLeft className="hidden size-4.5 shrink-0 stroke-[1.75] text-sidebar-foreground/70 group-hover/brand:block group-focus-visible/brand:block" />
    </button>
  )
}

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
              trailing edge, which is where all seven of the products we looked
              at put it. */}
          <SidebarMenuItem className="flex w-full items-center gap-1 group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              className="min-w-0 flex-1"
            >
              {/* The BOX is 18px, the same one every nav icon occupies, so
                  every label in the rail starts at the same x and every glyph
                  shares a centre line. The mark itself is drawn larger inside
                  it and overflows symmetrically, because a logo is not a nav
                  icon and shrinking it to 18px to win the alignment argument
                  just made it look broken instead.

                  Equal widths were never the requirement. Equal centres were,
                  and centring is what the column does now. */}
              <span className="flex size-4.5 shrink-0 items-center justify-center">
                <Image
                  src="/run-icon.png"
                  alt=""
                  width={28}
                  height={28}
                  className="size-[22px] max-w-none"
                />
              </span>
              <span className="text-base font-semibold">Run</span>
            </SidebarMenuButton>
            <SidebarTrigger
              aria-label="Collapse the sidebar"
              className="shrink-0 max-md:hidden"
            />
          </SidebarMenuItem>
          {/* Collapsed: the mark IS the control. It used to sit on its own row
              underneath, which spent one of about eight rows a 48px rail has
              on a thing you touch twice a day. Hovering swaps the mark for the
              panel icon, so the row costs nothing until you want it.

              It stops being a link to home when it is collapsed, and that
              loses nothing: New agent, directly below it, goes to the same
              place. */}
          <SidebarMenuItem className="hidden group-data-[collapsible=icon]:flex">
            <BrandToggle />
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
                  // Deliberately never active. It is the one row that acts
                  // rather than goes somewhere, and it happens to act by
                  // navigating to "/", which used to light it up as the
                  // current page whenever you were on the home screen. That
                  // put two contradictory marks on one row: the filled icon
                  // saying it does something, the wash saying you are here.
                  // Collapsed, with no label under it, the wash read as a box
                  // drawn around a green dot for no reason.
                  //
                  // Home keeps its door: the brand mark at the top of the rail
                  // is a link to the same place.
                  tooltip="New agent"
                  render={<Link href="/" />}
                  className="min-h-11 md:min-h-0"
                >
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary [&_svg]:size-3! [&_svg]:text-primary-foreground!">
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
