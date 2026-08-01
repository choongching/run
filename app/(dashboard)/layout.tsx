import { Suspense } from 'react'
import Image from 'next/image'

import { AppSidebar } from '@/components/app-sidebar'
import {
  AccountFallback,
  AccountSection,
  AgentsFallback,
  AgentsSection,
  MeterFallback,
  MeterSection,
  RoutinesBadgeFallback,
  RoutinesBadgeSection,
} from '@/components/sidebar/sections'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

// This layout awaits nothing.
//
// It used to resolve the identity, the profile, the agent list and the usage
// count before returning a single byte, and a layout blocks everything inside
// it: the page's own loading.tsx could not show either, so a person sat looking
// at nothing for as long as the slowest of those took. Measured from a laptop
// against a remote database that was most of a second.
//
// Now the shell and the page skeleton paint immediately and each piece of data
// streams into its own Suspense boundary as it arrives. The reads still run
// concurrently, so nothing got slower; what changed is that the first paint no
// longer waits for any of them.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar
        agentSlot={
          <Suspense fallback={<AgentsFallback />}>
            <AgentsSection />
          </Suspense>
        }
        meterSlot={
          <Suspense fallback={<MeterFallback />}>
            <MeterSection />
          </Suspense>
        }
        accountSlot={
          <Suspense fallback={<AccountFallback />}>
            <AccountSection />
          </Suspense>
        }
        routinesBadgeSlot={
          <Suspense fallback={<RoutinesBadgeFallback />}>
            <RoutinesBadgeSection />
          </Suspense>
        }
      />
      <SidebarInset>
        {/* The scroll container for page content. Normal pages scroll here;
            the chat page fills this height and scrolls only its message list,
            keeping its header and composer pinned.
            Padding belongs to the page, not to this container: the chat page
            docks a panel against the card's own edges, which it cannot do from
            inside a gutter it does not control. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* The mobile top bar (styleguide 5b): the one mobile-only piece
              of chrome. Sticky so the drawer is reachable mid-scroll; the
              chat page fills the height below it and pins its own composer. */}
          <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-1.5 border-b border-border bg-background px-1.5 md:hidden">
            <SidebarTrigger className="size-11" />
            <Image src="/run-icon.png" alt="" width={20} height={20} />
            <span className="text-sm font-semibold">Run</span>
          </header>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
