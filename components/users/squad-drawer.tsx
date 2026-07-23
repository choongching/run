'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, LoaderCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Agent, Profile } from '@/lib/types/database'
import { AgentsIcon } from '@/components/nav-icons'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function SquadDrawer({
  user,
  avatarColor,
  agents,
  assignedIds,
  open,
  onOpenChange,
  onToggle,
}: {
  user: Profile
  avatarColor: string
  agents: Agent[]
  assignedIds: Set<string>
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggle: (agentId: string, assign: boolean) => Promise<void>
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const name = user.display_name ?? 'Unnamed user'
  const firstName = name.split(' ')[0]
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function toggle(agent: Agent) {
    const assign = !assignedIds.has(agent.id)
    setPendingId(agent.id)
    try {
      await onToggle(agent.id, assign)
    } catch {
      toast.error(
        assign
          ? `Couldn't assign ${agent.name}. Please try again.`
          : `Couldn't remove ${agent.name}. Please try again.`
      )
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback
                className={`${avatarColor} text-xs font-medium text-white`}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="truncate">{name}</SheetTitle>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' ? 'Administrator' : 'Member'}
                </Badge>
              </div>
              <SheetDescription>
                Choose which agents {firstName} can run.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-background shadow-xs">
                <AgentsIcon className="size-5 stroke-[1.75] text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">No active agents yet</p>
              <p className="mt-1 max-w-60 text-sm text-muted-foreground">
                Create an agent first, then come back here to build squads.
              </p>
              <Link
                href="/admin/agents"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
              >
                Go to Agents
                <ChevronRight data-icon="inline-end" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm font-medium">Active agents</p>
                <p className="text-xs text-muted-foreground">
                  {assignedIds.size} of {agents.length} in squad
                </p>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {agents.map((agent) => {
                  const isAssigned = assignedIds.has(agent.id)
                  const isPending = pendingId === agent.id
                  return (
                    <li
                      key={agent.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {agent.description || agent.model}
                        </p>
                      </div>
                      <Button
                        variant={isAssigned ? 'secondary' : 'outline'}
                        size="sm"
                        className="shrink-0"
                        onClick={() => toggle(agent)}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <LoaderCircle
                            data-icon="inline-start"
                            className="animate-spin"
                          />
                        ) : isAssigned ? (
                          <Check data-icon="inline-start" />
                        ) : (
                          <Plus data-icon="inline-start" />
                        )}
                        {isAssigned ? 'In squad' : 'Assign'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        <SheetFooter className="border-t border-border p-5">
          <SheetClose render={<Button variant="outline" className="w-full" />}>
            Done
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
