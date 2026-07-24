'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  Ellipsis,
  ExternalLink,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MissionStatus } from '@/lib/types/database'
import {
  MISSION_COLUMNS,
  OUTPUT_TYPE_LABEL,
  type MissionWithAgent,
  type SquadAgent,
} from '@/components/missions/mission-status'
import { MissionDialog } from '@/components/missions/mission-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function MissionsBoard({
  initialMissions,
  agents,
}: {
  initialMissions: MissionWithAgent[]
  agents: SquadAgent[]
}) {
  const router = useRouter()
  // Authoritative after mount: every mutation lands here from the API
  // response, so the board never waits for a server round trip to move cards.
  const [missions, setMissions] = useState(initialMissions)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMission, setEditingMission] = useState<MissionWithAgent | null>(null)
  const [deletingMission, setDeletingMission] = useState<MissionWithAgent | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  function upsertMission(mission: MissionWithAgent) {
    setMissions((prev) => {
      const exists = prev.some((m) => m.id === mission.id)
      return exists
        ? prev.map((m) => (m.id === mission.id ? mission : m))
        : [mission, ...prev]
    })
  }

  function openCreate() {
    setEditingMission(null)
    setDialogOpen(true)
  }

  function openEdit(mission: MissionWithAgent) {
    setEditingMission(mission)
    setDialogOpen(true)
  }

  async function runMission(mission: MissionWithAgent) {
    upsertMission({ ...mission, status: 'in_progress' })
    try {
      const res = await fetch(`/api/missions/${mission.id}/run`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error ?? `Run failed (${res.status})`)
      }
      upsertMission(body.mission as MissionWithAgent)
      toast.success(`"${mission.title}" is done.`)
      router.refresh()
    } catch (err) {
      upsertMission({ ...mission, status: 'needs_attention' })
      toast.error(
        err instanceof Error ? err.message : 'The mission run failed.'
      )
      router.refresh()
    }
  }

  async function confirmDelete() {
    if (!deletingMission) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/missions/${deletingMission.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Delete failed (${res.status})`)
      }
      setMissions((prev) => prev.filter((m) => m.id !== deletingMission.id))
      setDeleteOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not delete the mission.'
      )
    } finally {
      setDeleting(false)
    }
  }

  if (missions.length === 0) {
    return (
      <>
        <EmptyBoard hasAgents={agents.length > 0} onCreate={openCreate} />
        <MissionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          agents={agents}
          mission={editingMission}
          onSaved={upsertMission}
        />
      </>
    )
  }

  const doneCount = missions.filter((m) => m.status === 'completed').length

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <p className="text-sm font-medium">
          {missions.length} mission{missions.length === 1 ? '' : 's'}
        </p>
        <p className="text-sm text-muted-foreground">{doneCount} completed</p>
        <div className="h-px flex-1 bg-border" />
        <Button size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          New mission
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {MISSION_COLUMNS.map((column) => {
          const columnMissions = missions.filter((m) => m.status === column.status)
          return (
            <section
              key={column.status}
              className="flex min-h-44 flex-col rounded-xl bg-muted/40 p-3"
            >
              <header className="mb-3 flex items-baseline gap-2 px-1">
                <h2 className="text-sm font-medium">{column.title}</h2>
                <span className="text-xs text-muted-foreground">
                  {columnMissions.length}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-3">
                {columnMissions.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 py-6 text-xs text-muted-foreground">
                    {column.status === 'needs_attention'
                      ? 'Nothing queued'
                      : column.status === 'in_progress'
                        ? 'Nothing running'
                        : 'Nothing finished yet'}
                  </div>
                ) : (
                  columnMissions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      status={column.status}
                      menuOpen={openMenuId === mission.id}
                      onMenuOpenChange={(open) =>
                        setOpenMenuId(open ? mission.id : null)
                      }
                      onRun={() => runMission(mission)}
                      onEdit={() => openEdit(mission)}
                      onDelete={() => {
                        setDeletingMission(mission)
                        setDeleteOpen(true)
                      }}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>

      <MissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agents={agents}
        mission={editingMission}
        onSaved={upsertMission}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle>Delete this mission?</DialogTitle>
            <DialogDescription>
              &ldquo;{deletingMission?.title}&rdquo; and its output record will
              be removed. Files already saved to Drive stay in Drive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Keep mission
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              )}
              Delete mission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MissionCard({
  mission,
  status,
  menuOpen,
  onMenuOpenChange,
  onRun,
  onEdit,
  onDelete,
}: {
  mission: MissionWithAgent
  status: MissionStatus
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onRun: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  const queued = status === 'needs_attention'
  const running = status === 'in_progress'
  const completed = status === 'completed'

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/missions/${mission.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          router.push(`/missions/${mission.id}`)
        }
      }}
      className={cn(
        'cursor-pointer gap-3 py-4 transition-[box-shadow,background-color] duration-150 hover:shadow-sm hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        menuOpen && 'shadow-sm ring-ring/50'
      )}
    >
      <CardHeader className="px-4">
        <CardTitle className="text-sm leading-snug">{mission.title}</CardTitle>
        {(queued || completed) && (
          <CardAction>
            <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
              <DropdownMenuTrigger
                aria-label={`Actions for ${mission.title}`}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                  '-mt-1 text-muted-foreground'
                )}
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {queued && (
                  <>
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        )}
      </CardHeader>
      <div className="flex flex-col gap-3 px-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {mission.brief}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
            <Bot className="size-3 shrink-0" />
            <span className="truncate">
              {mission.agents?.name ?? 'Unknown agent'}
            </span>
          </span>
          {queued && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRun()
              }}
            >
              <Play data-icon="inline-start" />
              Run
            </Button>
          )}
          {running && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin stroke-[1.75]" />
              Running
            </span>
          )}
          {completed &&
            (mission.output_url ? (
              <a
                href={mission.output_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                {OUTPUT_TYPE_LABEL[mission.output_type]}
                <ExternalLink data-icon="inline-end" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">
                {OUTPUT_TYPE_LABEL[mission.output_type]} saved
              </span>
            ))}
        </div>
      </div>
    </Card>
  )
}

function EmptyBoard({
  hasAgents,
  onCreate,
}: {
  hasAgents: boolean
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-card py-14 text-center shadow-xs">
      <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-background shadow-xs">
        <Target className="size-5 stroke-[1.75] text-muted-foreground" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">
        {hasAgents ? 'No missions yet' : 'Your squad is empty'}
      </h2>
      <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
        {hasAgents
          ? 'Brief one of your agents and it gets to work: reading its knowledge, doing the task, and delivering the result as a doc, sheet, or PDF.'
          : 'An admin needs to assign agents to you before you can run missions. Once that happens, this board is where you put them to work.'}
      </p>
      {hasAgents && (
        <Button className="mt-5" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          New mission
        </Button>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        {hasAgents
          ? 'Missions stay queued until you run them, so you can prepare several first.'
          : 'Ask your admin to add you to a squad on the Users page.'}
      </p>
    </div>
  )
}
