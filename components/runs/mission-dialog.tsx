'use client'

import { useState } from 'react'
import { Globe, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { MissionOutputType } from '@/lib/types/database'
import type { MissionWithAgent, SquadAgent } from '@/components/runs/mission-status'
import { OUTPUT_TYPE_LABEL } from '@/components/runs/mission-status'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const OUTPUT_OPTIONS: MissionOutputType[] = ['doc', 'sheet', 'pdf', 'text']

export function MissionDialog({
  open,
  onOpenChange,
  agents,
  mission,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: SquadAgent[]
  // Present = edit mode, absent = create mode.
  mission?: MissionWithAgent | null
  onSaved: (mission: MissionWithAgent) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        {/* The body remounts on every open (closed dialog content is
            unmounted), so useState initializers seed the form fresh. */}
        <MissionDialogBody
          key={mission?.id ?? 'new'}
          onOpenChange={onOpenChange}
          agents={agents}
          mission={mission}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  )
}

function MissionDialogBody({
  onOpenChange,
  agents,
  mission,
  onSaved,
}: {
  onOpenChange: (open: boolean) => void
  agents: SquadAgent[]
  mission?: MissionWithAgent | null
  onSaved: (mission: MissionWithAgent) => void
}) {
  const [agentId, setAgentId] = useState(
    mission?.agent_id ?? agents[0]?.id ?? ''
  )
  const [title, setTitle] = useState(mission?.title ?? '')
  const [brief, setBrief] = useState(mission?.brief ?? '')
  const [outputType, setOutputType] = useState<MissionOutputType>(
    mission?.output_type ??
      agents.find((a) => a.id === (mission?.agent_id ?? agents[0]?.id))
        ?.default_output_type ??
      'doc'
  )
  const [webSearch, setWebSearch] = useState(mission?.web_search ?? false)
  const [saving, setSaving] = useState(false)

  const editing = Boolean(mission)
  const selectedAgent = agents.find((a) => a.id === agentId)
  // The agent's tool config is the ceiling: when web search is off at the
  // agent level, the per-mission control disappears entirely (never shown
  // disabled) and the flag is forced off.
  const webSearchAvailable = selectedAgent?.web_search_allowed ?? true

  function selectAgent(id: string) {
    setAgentId(id)
    const next = agents.find((a) => a.id === id)
    // A fresh mission adopts the newly chosen agent's default output.
    if (!editing && next?.default_output_type) {
      setOutputType(next.default_output_type)
    }
    if (next && !next.web_search_allowed) setWebSearch(false)
  }

  const valid = agentId && title.trim() && brief.trim()

  async function save() {
    if (!valid) return
    setSaving(true)
    try {
      const payload = {
        agent_id: agentId,
        title: title.trim(),
        brief: brief.trim(),
        output_type: outputType,
        web_search: webSearch && webSearchAvailable,
      }
      const res = mission
        ? await fetch(`/api/missions/${mission.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error ?? `Save failed (${res.status})`)
      }
      onSaved(body.mission as MissionWithAgent)
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save the run.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader className="pr-8">
          <DialogTitle>{editing ? 'Edit run' : 'New run'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Queued runs can be reshaped freely before they start.'
              : 'Tell an agent what you need and choose how the result comes back.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mission-agent">Agent</Label>
            <Select value={agentId} onValueChange={(v) => v && selectAgent(String(v))}>
              <SelectTrigger id="mission-agent" className="w-full">
                <SelectValue>
                  {agents.find((a) => a.id === agentId)?.name ?? 'Choose an agent'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mission-title">Title</Label>
            <Input
              id="mission-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q3 launch announcement"
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mission-brief">Brief</Label>
            <Textarea
              id="mission-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="What should the agent produce? Audience, key points, length, anything that matters."
              rows={6}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="mission-output">Output</Label>
              <Select
                value={outputType}
                onValueChange={(v) => v && setOutputType(v as MissionOutputType)}
              >
                <SelectTrigger id="mission-output" className="w-full">
                  <SelectValue>{OUTPUT_TYPE_LABEL[outputType]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {OUTPUT_TYPE_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {webSearchAvailable && (
              <div className="grid gap-2">
                <Label htmlFor="mission-web-search">Web search</Label>
                <div className="flex h-9 items-center gap-2.5">
                  <Switch
                    id="mission-web-search"
                    checked={webSearch}
                    onCheckedChange={setWebSearch}
                  />
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Globe className="size-3.5 stroke-[1.75]" />
                    {webSearch ? 'Allowed' : 'Off'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving && (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            )}
            {editing ? 'Save changes' : 'Start later'}
          </Button>
        </DialogFooter>
    </>
  )
}
