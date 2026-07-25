'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Globe, LoaderCircle, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import type { Agent, AgentEnabledTools, OutputType } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

const OUTPUT_LABEL: Record<OutputType, string> = {
  doc: 'Google Doc',
  sheet: 'Google Sheet',
  pdf: 'PDF',
  text: 'Just text',
}

// Wizard-configured behavior (tools, guardrails, default output) editable
// after creation; also where a draft left mid-wizard gets published.
export function AgentBehaviorCard({ agent }: { agent: Agent }) {
  const router = useRouter()
  const [tools, setTools] = useState<AgentEnabledTools>({
    web_search: agent.enabled_tools?.web_search !== false,
    drive: agent.enabled_tools?.drive !== false,
  })
  const [guardrails, setGuardrails] = useState(agent.guardrails ?? '')
  const [output, setOutput] = useState<OutputType>(
    agent.default_output_type ?? 'doc'
  )
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error ?? `Save failed (${res.status})`)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await patch({
        enabled_tools: tools,
        guardrails,
        default_output_type: output,
      })
      toast.success('Behavior saved.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function publishDraft() {
    setPublishing(true)
    try {
      await patch({ status: 'active' })
      toast.success(`${agent.name} is live.`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publishing failed.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <CardTitle>Behavior</CardTitle>
            <CardDescription>
              Tools are enforced for real; guardrails are written rules the
              agent follows, not locked doors.
            </CardDescription>
          </div>
          {agent.status === 'draft' && (
            <Button size="sm" onClick={publishDraft} disabled={publishing}>
              {publishing ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Rocket data-icon="inline-start" />
              )}
              Publish agent
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="divide-y divide-border rounded-xl border border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-3 text-sm">
              <Globe className="size-4 stroke-[1.75] text-muted-foreground" />
              Search the web
            </span>
            <Switch
              checked={tools.web_search}
              onCheckedChange={(v) => setTools((t) => ({ ...t, web_search: v }))}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-3 text-sm">
              <FileText className="size-4 stroke-[1.75] text-muted-foreground" />
              Read Drive data sources
            </span>
            <Switch
              checked={tools.drive}
              onCheckedChange={(v) => setTools((t) => ({ ...t, drive: v }))}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="behavior-guardrails">Guardrails</Label>
          <Textarea
            id="behavior-guardrails"
            value={guardrails}
            onChange={(e) => setGuardrails(e.target.value)}
            placeholder="e.g. Never mention competitor names."
            rows={3}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="behavior-output">Default output</Label>
          <Select
            value={output}
            onValueChange={(v) => v && setOutput(v as OutputType)}
          >
            <SelectTrigger id="behavior-output" className="w-full sm:w-64">
              <SelectValue>{OUTPUT_LABEL[output]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(OUTPUT_LABEL) as OutputType[]).map((o) => (
                <SelectItem key={o} value={o}>
                  {OUTPUT_LABEL[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            )}
            Save behavior
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
