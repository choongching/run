'use client'

import { useState } from 'react'
import { LoaderCircle, Sparkles, TriangleAlert } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'

export function GeneratePromptDialog({
  open,
  onOpenChange,
  onGenerated,
  hasCompanyContext,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: (systemPrompt: string) => void
  hasCompanyContext: boolean
}) {
  const [role, setRole] = useState('')
  const [tasks, setTasks] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setRole('')
      setTasks('')
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, tasks }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      onGenerated(data.system_prompt)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate system prompt</DialogTitle>
          <DialogDescription>
            Describe the agent&apos;s role and tasks. Claude drafts the system prompt
            using your saved company context.
          </DialogDescription>
        </DialogHeader>

        {!hasCompanyContext && (
          <div className="flex items-start gap-2 rounded-lg bg-chart-4/10 px-3 py-2 text-sm text-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-chart-4" />
            <span>
              No company context saved yet. The prompt will be generic; add context on
              the Company page for on-brand results.
            </span>
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="generate-role">Role</Label>
            <Input
              id="generate-role"
              placeholder="e.g. Social media copywriter"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="generate-tasks">Typical tasks</Label>
            <Textarea
              id="generate-tasks"
              rows={4}
              placeholder="e.g. Draft LinkedIn posts from product updates, keep captions under 150 words..."
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !role.trim() || !tasks.trim()}>
            {generating ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
