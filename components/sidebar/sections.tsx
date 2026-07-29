import { AccountMenu } from '@/components/sidebar/account-menu'
import { AgentList, type SidebarAgent } from '@/components/sidebar/agent-list'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { UsageMeter } from '@/components/usage/usage-meter'
import { getUserIdentity, getUserProfile } from '@/lib/auth'
import { getRunAllowance } from '@/lib/entitlements/assert'
import { createClient } from '@/lib/supabase/server'

// One async server component per slot in the sidebar.
//
// Each fetches only what it needs and is wrapped in its own Suspense boundary
// by the layout, so a slow read holds up its own corner of the frame instead of
// the whole app. They still run concurrently: React starts every boundary at
// once, so this is the same wall clock as the old Promise.all, minus the wait
// before anything is on screen.
//
// getUserIdentity is memoised per request and resolves locally from the
// verified token, so asking for it three times costs nothing.

export async function AgentsSection() {
  const { userId } = await getUserIdentity()
  const supabase = await createClient()

  // The user's list of agents (each an ongoing chat). v1 shows the agents they
  // own; RLS scopes the read regardless.
  const { data } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('owner_id', userId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  const agents: SidebarAgent[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }))

  return <AgentList agents={agents} />
}

// Nothing, deliberately. The agent list has no fixed height, so a placeholder
// would be a guess at how many rows are coming and would shift the nav under
// the pointer when the real list replaced it.
export function AgentsFallback() {
  return null
}

export async function MeterSection() {
  const { userId } = await getUserIdentity()
  const supabase = await createClient()
  // No plan column exists yet, so everyone resolves to the default plan. The
  // argument is here for when billing gives them one.
  const usage = await getRunAllowance(supabase, userId)

  return (
    <UsageMeter
      key={usage.used}
      userId={userId}
      used={usage.used}
      limit={usage.limit}
      resetsAt={usage.resetsAt}
    />
  )
}

export function MeterFallback() {
  return (
    <div className="flex flex-col gap-2 px-2 py-1.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  )
}

export async function AccountSection() {
  const { email, profile } = await getUserProfile()

  return (
    <AccountMenu
      displayName={profile?.display_name ?? ''}
      email={email}
      avatarUrl={profile?.avatar_url ?? null}
    />
  )
}

// Matches the account row's height so the footer does not jump when the
// profile lands.
export function AccountFallback() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 p-2">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
