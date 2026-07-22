'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Bot, CalendarDays, Copy, Ellipsis, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent, AgentStatus } from '@/lib/types/database'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STATUS_DOT: Record<AgentStatus, string> = {
  active: 'bg-chart-1',
  draft: 'bg-muted-foreground/50',
  paused: 'bg-chart-4',
  archived: 'bg-muted-foreground/40',
}

function MetaChip({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground [&_svg]:size-3 [&_svg]:shrink-0',
        className
      )}
    >
      {children}
    </span>
  )
}

export function AgentList({ agents }: { agents: Agent[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  async function handleArchive(agent: Agent) {
    setPendingId(agent.id)
    try {
      await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
    } finally {
      setPendingId(null)
      router.refresh()
    }
  }

  async function handleDuplicate(agent: Agent) {
    setPendingId(agent.id)
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${agent.name} (copy)`,
          description: agent.description ?? '',
          model: agent.model,
          system_prompt: agent.system_prompt ?? '',
        }),
      })
    } finally {
      setPendingId(null)
      router.refresh()
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {agents.map((agent) => {
        const archived = agent.status === 'archived'
        const menuOpen = openMenuId === agent.id
        const pending = pendingId === agent.id
        return (
          <Card
            key={agent.id}
            className={cn(
              'h-full transition-[box-shadow,background-color] duration-150',
              archived
                ? 'bg-muted/40 ring-foreground/5'
                : 'hover:shadow-sm hover:ring-foreground/20',
              menuOpen && 'shadow-sm ring-ring/50'
            )}
          >
            <CardHeader>
              <CardTitle className={archived ? 'text-muted-foreground' : undefined}>
                <Link
                  href={`/admin/agents/${agent.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {agent.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {agent.description || 'No description yet.'}
              </CardDescription>
              <CardAction>
                <DropdownMenu
                  open={menuOpen}
                  onOpenChange={(open) => setOpenMenuId(open ? agent.id : null)}
                >
                  <DropdownMenuTrigger
                    aria-label={`Actions for ${agent.name}`}
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                      'text-muted-foreground'
                    )}
                  >
                    <Ellipsis />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/admin/agents/${agent.id}`)}
                    >
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={pending}
                      onClick={() => handleDuplicate(agent)}
                    >
                      <Copy />
                      Duplicate
                    </DropdownMenuItem>
                    {!archived && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={pending}
                          onClick={() => handleArchive(agent)}
                        >
                          <Archive />
                          Archive
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardAction>
            </CardHeader>
            <CardFooter className="mt-auto flex-wrap gap-1.5 border-0 bg-transparent pt-0">
              <MetaChip>
                <span
                  aria-hidden
                  className={cn('size-1.5 rounded-full', STATUS_DOT[agent.status])}
                />
                <span className="capitalize">{agent.status}</span>
              </MetaChip>
              <MetaChip>
                <CalendarDays />
                {agent.created_at.slice(0, 10).replaceAll('-', '/')}
              </MetaChip>
              <MetaChip>
                <Bot />
                {agent.model}
              </MetaChip>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
