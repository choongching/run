'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteAgent } from '@/app/actions/agents'
import { AgentsIcon } from '@/components/nav-icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TruncatedLabel } from '@/components/ui/truncated-label'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
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
//
// Every row carries its own Delete so an agent can always be removed from
// here, whatever state its chat page is in. The chat must never be the only
// door to deleting the agent it belongs to.
export function AgentList({ agents }: { agents: SidebarAgent[] }) {
  const pathname = usePathname()
  const router = useRouter()
  // The agent a Delete was clicked for; the dialog confirms before anything
  // happens. Kept after close so the dialog holds its content through the
  // exit transition.
  const [target, setTarget] = useState<SidebarAgent | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function remove() {
    if (!target) return
    setDeleting(true)
    try {
      await deleteAgent(target.id)
      toast(`${target.name} deleted.`)
      setConfirmOpen(false)
      // Deleting the chat someone is looking at leaves them on a dead page;
      // walk them home instead.
      if (pathname === `/chat/${target.id}`) router.push('/')
      router.refresh()
    } catch {
      toast.error("We couldn't delete this agent. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  // A new user's sidebar used to just go blank below New agent. This keeps
  // the Agents heading and shows one empty slot instead: a quiet dashed
  // outline that says what the space is for. No button and no arrow, because
  // the way to fill it is sitting directly above.
  if (agents.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Agents</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="mx-2 rounded-lg border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
            Your agents will live here
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Agents</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {agents.map((agent) => (
            <SidebarMenuItem key={agent.id}>
              {/* pr-7 reserves the action's lane, so the truncating label
                  never runs under the trash and its tooltip never fights it. */}
              <SidebarMenuButton
                isActive={pathname === `/chat/${agent.id}`}
                // Collapsed, every agent is the same robot icon, so the name
                // has to live somewhere. The tooltip only renders in icon
                // mode, which is exactly when the label is gone.
                tooltip={agent.name}
                render={<Link href={`/chat/${agent.id}`} />}
                // min-h-11: the mobile tap floor (styleguide 5b); md resets.
                // pr-7 clears the delete action, which the primitive hides in
                // icon mode; the padding goes with it or the icon sits off
                // centre in a 32px square.
                className="min-h-11 pr-7 group-data-[collapsible=icon]:pr-2! md:min-h-0"
              >
                <AgentsIcon className="size-4.5 shrink-0" />
                <TruncatedLabel text={agent.name} />
              </SidebarMenuButton>
              {/* Quiet at rest (muted, smaller than nav icons), destructive
                  only on its own hover: it should read as an option, not a
                  warning, until pointed at. */}
              <SidebarMenuAction
                showOnHover
                aria-label={`Delete ${agent.name}`}
                // after:-inset-3 grows the tap area to ~44px on touch (the
                // visible icon stays small); max-md re-centers it in the
                // taller mobile row.
                // top-3! centres the 20px action in the 44px mobile row and
                // must out-shout the component's own size-variant top-2.
                className="text-muted-foreground/60 peer-hover/menu-button:text-muted-foreground/60 hover:bg-transparent hover:text-destructive [&>svg]:size-3.5 after:-inset-3 max-md:top-3!"
                onClick={() => {
                  setTarget(agent)
                  setConfirmOpen(true)
                }}
              >
                <Trash2 />
              </SidebarMenuAction>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {target?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the agent and its entire chat history.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting && <Loader2 className="size-3.5 animate-spin" />}
              {deleting ? 'Deleting' : 'Delete agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarGroup>
  )
}
