'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Agent, Profile } from '@/lib/types/database'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SquadDrawer } from '@/components/users/squad-drawer'

const AVATAR_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-5']
const MAX_SQUAD_CHIPS = 3

export function UsersTable({
  profiles,
  agents,
  initialAssignments,
}: {
  profiles: Profile[]
  agents: Agent[]
  initialAssignments: Record<string, string[]>
}) {
  const router = useRouter()
  // selectedUserId survives close so the drawer keeps its content during the
  // exit animation; `drawerOpen` alone drives visibility.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Client state is authoritative after mount: every toggle is saved to the
  // server immediately, so this only diverges from the DB on a failed call,
  // where the optimistic update is reverted.
  const [assignments, setAssignments] = useState<Map<string, Set<string>>>(
    () =>
      new Map(
        profiles.map((p) => [p.id, new Set(initialAssignments[p.id] ?? [])])
      )
  )

  const agentNames = new Map(agents.map((a) => [a.id, a.name]))

  function setAssigned(userId: string, agentId: string, assign: boolean) {
    setAssignments((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(userId) ?? [])
      if (assign) set.add(agentId)
      else set.delete(agentId)
      next.set(userId, set)
      return next
    })
  }

  async function toggleAssignment(
    userId: string,
    agentId: string,
    assign: boolean
  ) {
    setAssigned(userId, agentId, assign)
    try {
      const res = assign
        ? await fetch(`/api/admin/users/${userId}/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_id: agentId }),
          })
        : await fetch(`/api/admin/users/${userId}/agents/${agentId}`, {
            method: 'DELETE',
          })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      router.refresh()
    } catch (err) {
      setAssigned(userId, agentId, !assign)
      throw err
    }
  }

  function openDrawer(userId: string) {
    setSelectedUserId(userId)
    setDrawerOpen(true)
  }

  const drawerUser = profiles.find((p) => p.id === selectedUserId)
  const drawerIndex = profiles.findIndex((p) => p.id === selectedUserId)
  const adminCount = profiles.filter((p) => p.role === 'admin').length

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <p className="text-sm font-medium">
          {profiles.length} user{profiles.length === 1 ? '' : 's'}
        </p>
        <p className="text-sm text-muted-foreground">
          {adminCount} administrator{adminCount === 1 ? '' : 's'}
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Squad</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile, i) => {
              const initials = (profile.display_name ?? '?')
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
              const assigned = [...(assignments.get(profile.id) ?? [])]
                .map((id) => ({ id, name: agentNames.get(id) }))
                .filter((a): a is { id: string; name: string } => Boolean(a.name))
                .sort((a, b) => a.name.localeCompare(b.name))
              const overflow = assigned.length - MAX_SQUAD_CHIPS
              return (
                <tr
                  key={profile.id}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                  onClick={() => openDrawer(profile.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback
                          className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-xs font-medium text-white`}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {profile.display_name ?? 'Unnamed user'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={profile.role === 'admin' ? 'default' : 'secondary'}
                    >
                      {profile.role === 'admin' ? 'Administrator' : 'Member'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {assigned.length === 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDrawer(profile.id)
                        }}
                      >
                        <Plus data-icon="inline-start" />
                        Assign agents
                      </Button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assigned.slice(0, MAX_SQUAD_CHIPS).map((agent) => (
                          <span
                            key={agent.id}
                            className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground"
                          >
                            {agent.name}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span
                            className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground"
                            title={assigned
                              .slice(MAX_SQUAD_CHIPS)
                              .map((a) => a.name)
                              .join(', ')}
                          >
                            +{overflow}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDrawer(profile.id)
                      }}
                    >
                      Edit squad
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {drawerUser && (
        <SquadDrawer
          user={drawerUser}
          avatarColor={AVATAR_COLORS[drawerIndex % AVATAR_COLORS.length]}
          agents={agents}
          assignedIds={assignments.get(drawerUser.id) ?? new Set()}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onToggle={(agentId, assign) =>
            toggleAssignment(drawerUser.id, agentId, assign)
          }
        />
      )}
    </>
  )
}
