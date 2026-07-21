'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus } from 'lucide-react'
import type { Agent } from '@/lib/types/database'
import { Button } from '@/components/ui/button'

export function SquadEditor({
  userId,
  agents,
  assignedAgentIds,
}: {
  userId: string
  agents: Agent[]
  assignedAgentIds: string[]
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const assigned = new Set(assignedAgentIds)

  async function toggle(agent: Agent) {
    setPendingId(agent.id)
    try {
      if (assigned.has(agent.id)) {
        await fetch(`/api/admin/users/${userId}/agents/${agent.id}`, {
          method: 'DELETE',
        })
      } else {
        await fetch(`/api/admin/users/${userId}/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agent.id }),
        })
      }
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  if (agents.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        No active agents yet. Create one on the Agents page first.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {agents.map((agent) => {
        const isAssigned = assigned.has(agent.id)
        return (
          <li key={agent.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{agent.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {agent.description || agent.model}
              </p>
            </div>
            <Button
              variant={isAssigned ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => toggle(agent)}
              disabled={pendingId === agent.id}
            >
              {isAssigned ? (
                <Check data-icon="inline-start" />
              ) : (
                <Plus data-icon="inline-start" />
              )}
              {pendingId === agent.id
                ? 'Working...'
                : isAssigned
                  ? 'In squad'
                  : 'Assign'}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
