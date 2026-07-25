'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Lock, LoaderCircle, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AgentVisibility } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Member = { id: string; name: string }
type Share = { userId: string; name: string }

export function AgentSharingCard({
  agentId,
  visibility: initialVisibility,
  members,
  initialShares,
}: {
  agentId: string
  visibility: AgentVisibility
  members: Member[]
  initialShares: Share[]
}) {
  const router = useRouter()
  const [visibility, setVisibility] = useState<AgentVisibility>(initialVisibility)
  const [shares, setShares] = useState<Share[]>(initialShares)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function saveVisibility(next: AgentVisibility) {
    setPending(true)
    const prev = visibility
    setVisibility(next)
    try {
      const res = await fetch(`/api/agents/${agentId}/sharing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setVisibility(prev)
      toast.error('That change did not save. Try again.')
    } finally {
      setPending(false)
      setConfirmOpen(false)
    }
  }

  async function addPerson(member: Member) {
    if (shares.some((s) => s.userId === member.id)) return
    setShares((prev) => [...prev, { userId: member.id, name: member.name }])
    try {
      const res = await fetch(`/api/agents/${agentId}/sharing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: member.id }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setShares((prev) => prev.filter((s) => s.userId !== member.id))
      toast.error('That change did not save. Try again.')
    }
  }

  async function removePerson(userId: string) {
    const removed = shares.find((s) => s.userId === userId)
    setShares((prev) => prev.filter((s) => s.userId !== userId))
    try {
      const res = await fetch(
        `/api/agents/${agentId}/sharing?user_id=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
    } catch {
      if (removed) setShares((prev) => [...prev, removed])
      toast.error('That change did not save. Try again.')
    }
  }

  const addable = members.filter(
    (m) => !shares.some((s) => s.userId === m.id)
  )
  const company = visibility === 'company'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sharing</CardTitle>
        <CardDescription>
          Choose who can see and run this agent. You can change this any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => !company || saveVisibility('private')}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
              !company
                ? 'border-primary ring-1 ring-primary'
                : 'border-border hover:bg-muted/40'
            )}
          >
            <Lock className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-muted-foreground" />
            <span>
              <span className="block text-sm font-medium">
                Only you and people you add
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Private until you share it.
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => (company ? undefined : setConfirmOpen(true))}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
              company
                ? 'border-primary ring-1 ring-primary'
                : 'border-border hover:bg-muted/40'
            )}
          >
            <Building2 className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-muted-foreground" />
            <span>
              <span className="block text-sm font-medium">
                Everyone at your company
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Anyone can find and run it.
              </span>
            </span>
          </button>
        </div>

        {company ? (
          <p className="text-sm text-muted-foreground">
            Everyone at your company can run this agent.
          </p>
        ) : (
          <div className="grid gap-2">
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Just you so far. Add teammates below, or open it to the whole
                company above.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {shares.map((share) => (
                  <li
                    key={share.userId}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm">{share.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Can run
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${share.name}`}
                        onClick={() => removePerson(share.userId)}
                      >
                        <X />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {addable.length > 0 && (
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted/40'
                    )}
                  >
                    <Plus className="size-4 stroke-[1.75]" />
                    Add a teammate
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {addable.map((m) => (
                      <DropdownMenuItem key={m.id} onClick={() => addPerson(m)}>
                        {m.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle>Share with everyone?</DialogTitle>
            <DialogDescription>
              Everyone at your company will be able to find and run this
              agent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveVisibility('company')}
              disabled={pending}
            >
              {pending && (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Share with everyone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
