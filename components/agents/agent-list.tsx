'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function AgentList({ agents }: { agents: Agent[] }) {
  const router = useRouter()
  const [archivingId, setArchivingId] = useState<string | null>(null)

  async function handleArchive(agent: Agent) {
    setArchivingId(agent.id)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Archive failed')
      }
      router.refresh()
    } catch {
      // Refresh anyway so the UI reflects actual server state.
      router.refresh()
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => {
        const archived = agent.status === 'archived'
        return (
          <Card
            key={agent.id}
            className={cn(
              'h-full transition-[box-shadow,background-color] duration-150',
              archived
                ? 'bg-muted/40 ring-foreground/5'
                : 'hover:shadow-sm hover:ring-foreground/20'
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className={archived ? 'text-muted-foreground' : undefined}>
                  {agent.name}
                </CardTitle>
                {agent.status !== 'active' && (
                  <Badge variant="secondary" className="capitalize">
                    {agent.status}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {agent.description || 'No description yet.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Model:{' '}
                <span className={archived ? undefined : 'text-foreground'}>
                  {agent.model}
                </span>
              </p>
            </CardContent>
            <CardFooter className={cn('mt-auto gap-2', archived && 'bg-transparent')}>
              <Link
                href={`/admin/agents/${agent.id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Pencil data-icon="inline-start" />
                Edit
              </Link>
              {!archived && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(agent)}
                  disabled={archivingId === agent.id}
                >
                  <Archive data-icon="inline-start" />
                  {archivingId === agent.id ? 'Archiving...' : 'Archive'}
                </Button>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
