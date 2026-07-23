'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { BookOpen, ScrollText, SlidersHorizontal, Sparkles } from 'lucide-react'
import type { Agent } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AgentKnowledgeEditor } from '@/components/agents/agent-knowledge-editor'
import { GeneratePromptDialog } from '@/components/agents/generate-prompt-dialog'

const MODEL_OPTIONS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
]

export function AgentForm({
  mode,
  agent,
  hasCompanyContext,
  driveConnected = false,
}: {
  mode: 'create' | 'edit'
  agent?: Agent
  hasCompanyContext: boolean
  driveConnected?: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(agent?.name ?? '')
  const [description, setDescription] = useState(agent?.description ?? '')
  const [model, setModel] = useState(agent?.model ?? MODEL_OPTIONS[0].id)
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? '')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name,
        description,
        model,
        system_prompt: systemPrompt,
      }
      const res = await fetch(
        mode === 'create' ? '/api/agents' : `/api/agents/${agent!.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      router.push('/admin/agents')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="configuration" className="gap-6">
        {/* Inner nav: section tabs left, the always-visible primary actions right. */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-border">
          <TabsList variant="line" className="mb-1">
            <TabsTrigger value="configuration" className="after:bg-primary">
              <SlidersHorizontal data-icon="inline-start" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="prompt" className="after:bg-primary">
              <ScrollText data-icon="inline-start" />
              System prompt
            </TabsTrigger>
            <TabsTrigger
              value="knowledge"
              className="after:bg-primary"
              disabled={mode === 'create'}
            >
              <BookOpen data-icon="inline-start" />
              Knowledge
            </TabsTrigger>
          </TabsList>
          <div className="mb-2 flex items-center gap-2">
            {error && <p className="mr-1 text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/agents')}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || !name.trim()}>
              {saving
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create agent'
                  : 'Save changes'}
            </Button>
          </div>
        </div>

        <TabsContent value="configuration" keepMounted>
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                What this agent is called, what it does, and which model runs it.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="agent-name">Name</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g. Marketing Writer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-description">Description</Label>
                <Textarea
                  id="agent-description"
                  rows={3}
                  placeholder="What does this agent do, and for whom?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-model">Model</Label>
                <Select value={model} onValueChange={(v) => v && setModel(String(v))}>
                  <SelectTrigger id="agent-model" className="w-full">
                    <SelectValue>
                      {MODEL_OPTIONS.find((m) => m.id === model)?.label ?? model}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" keepMounted>
          <Card>
            <CardHeader>
              <CardTitle>System prompt</CardTitle>
              <CardDescription>
                The standing instructions this agent follows on every mission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="edit">
                {/* Editor toolbar: AI assist next to the surface it acts on,
                    view toggle right-aligned on the same row. */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Sparkles data-icon="inline-start" />
                    Generate with AI
                  </Button>
                  <TabsList>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="edit" className="pt-3" keepMounted>
                  <Textarea
                    rows={20}
                    placeholder="You are..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview" className="pt-3">
                  {systemPrompt.trim() ? (
                    <div className="prose prose-sm max-w-none rounded-lg border border-border p-4 dark:prose-invert">
                      <ReactMarkdown>{systemPrompt}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                      Nothing to preview yet.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {mode === 'edit' && agent && (
          <TabsContent value="knowledge" keepMounted>
            <AgentKnowledgeEditor agentId={agent.id} driveConnected={driveConnected} />
          </TabsContent>
        )}
      </Tabs>

      <GeneratePromptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onGenerated={setSystemPrompt}
        hasCompanyContext={hasCompanyContext}
      />
    </form>
  )
}
