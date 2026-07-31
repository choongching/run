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
              <SidebarMenuButton
                isActive={pathname === `/chat/${agent.id}`}
                render={<Link href={`/chat/${agent.id}`} />}
              >
                <AgentsIcon className="size-4.5 shrink-0" />
                <TruncatedLabel text={agent.name} />
              </SidebarMenuButton>
              <SidebarMenuAction
                showOnHover
                aria-label={`Delete ${agent.name}`}
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
