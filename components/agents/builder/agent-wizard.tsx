'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Globe,
  LoaderCircle,
  Lock,
  Play,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  AgentEnabledTools,
  AgentVisibility,
  OutputType,
} from '@/lib/types/database'
import { AgentKnowledgeEditor } from '@/components/agents/agent-knowledge-editor'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const STEPS = [
  'Identity',
  'Data sources',
  'Tools',
  'Guardrails',
  'Output',
  'Test it',
  'Publish',
] as const

const GUARDRAIL_SUGGESTIONS = [
  'Stick to provided files for facts',
  'Always cite where information came from',
  'Flag anything uncertain instead of guessing',
]

const OUTPUT_CARDS: {
  value: OutputType
  label: string
  caption: string
  icon: typeof FileText
}[] = [
  { value: 'doc', label: 'Google Doc', caption: 'Best for writing: posts, emails, reports.', icon: FileText },
  { value: 'sheet', label: 'Google Sheet', caption: 'Best for lists, tables, and data.', icon: FileSpreadsheet },
  { value: 'pdf', label: 'PDF', caption: 'Best for polished, ready-to-send files.', icon: FileText },
  { value: 'text', label: 'Just text', caption: 'Show the result in Run, no file.', icon: FileText },
]

export function AgentWizard({
  hasCompanyContext,
  driveConnected,
}: {
  hasCompanyContext: boolean
  driveConnected: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  // Created as a draft when Identity completes, so later steps (knowledge,
  // test) have a real agent to work against.
  const [agentId, setAgentId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [tools, setTools] = useState<AgentEnabledTools>({
    web_search: true,
    drive: true,
  })
  const [guardrails, setGuardrails] = useState('')
  const [output, setOutput] = useState<OutputType>('doc')
  const [visibility, setVisibility] = useState<AgentVisibility>('private')
  const [showInstructions, setShowInstructions] = useState(false)
  const [testBrief, setTestBrief] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  async function generateInstructions() {
    if (!name.trim()) {
      toast.error('Give the agent a name first.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/agents/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: name.trim(),
          tasks: description.trim() || name.trim(),
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error ?? 'Generation failed')
      setInstructions(body.prompt ?? body.system_prompt ?? '')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'The draft did not come through. Try again, or write a few lines yourself.'
      )
    } finally {
      setGenerating(false)
    }
  }

  // Persist the current step's fields; creates the draft on first save.
  async function saveStep(): Promise<boolean> {
    const payload = {
      name: name.trim(),
      description: description.trim(),
      system_prompt: instructions,
      enabled_tools: tools,
      guardrails,
      default_output_type: output,
    }
    setBusy(true)
    try {
      if (!agentId) {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, status: 'draft' }),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? 'Could not save the draft')
        setAgentId(body.agent.id as string)
      } else {
        const res = await fetch(`/api/agents/${agentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? 'Could not save that step')
      }
      return true
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `${err.message}. Your changes are still here, try again.`
          : 'Couldn’t save that step. Your changes are still here, try again.'
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    if (step === 0 && (!name.trim() || !instructions.trim())) {
      toast.error('A name and some instructions are all it needs to start.')
      return
    }
    if (await saveStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  async function runTest() {
    if (!agentId || !testBrief.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: testBrief.trim() }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error ?? 'The test did not finish')
      setTestResult(body.result as string)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `${err.message}. Try adjusting the instructions and test again.`
          : 'The test did not finish.'
      )
    } finally {
      setTesting(false)
    }
  }

  async function publish() {
    if (!agentId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Publishing failed')
      }
      if (visibility === 'company') {
        await fetch(`/api/agents/${agentId}/sharing`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility: 'company' }),
        })
      }
      toast.success(`${name.trim()} is live.`)
      router.push(`/agents/${agentId}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publishing failed.')
    } finally {
      setBusy(false)
    }
  }

  const assembled = [
    instructions.trim(),
    guardrails.trim()
      ? `## Rules from this agent's owner\n\nFollow these rules carefully:\n${guardrails.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return (
    <div className="max-w-3xl">
      {/* Step rail: the seven labels laid out as one path are the teaching
          device — agent = instructions + data + tools + guardrails. */}
      <ol className="mb-6 flex flex-wrap items-center gap-x-1 gap-y-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className="mx-1 h-px w-4 bg-border" />}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs',
                i === step
                  ? 'bg-primary text-primary-foreground font-medium'
                  : i < step
                    ? 'text-foreground'
                    : 'text-muted-foreground'
              )}
            >
              {i < step && <Check className="size-3 stroke-[2]" />}
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Who is this agent?</CardTitle>
            <CardDescription>
              Give it a name, say what it is for, and set its instructions.
              You can change everything later.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="wiz-name">Name</Label>
              <Input
                id="wiz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Blog writer"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wiz-desc">What it does</Label>
              <Input
                id="wiz-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Writes first-draft blog posts in our voice"
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="wiz-instructions">Instructions</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateInstructions}
                  disabled={generating}
                >
                  {generating ? (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <Sparkles data-icon="inline-start" />
                  )}
                  Write the instructions for me
                </Button>
              </div>
              <Textarea
                id="wiz-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="You are a helpful writing assistant for our company…"
                rows={10}
                className="font-mono text-xs"
              />
              {!hasCompanyContext && (
                <p className="text-xs text-muted-foreground">
                  Tip: once an admin saves your company context under Company,
                  generated instructions pick up your brand voice
                  automatically.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && agentId && (
        <Card>
          <CardHeader>
            <CardTitle>What should it read?</CardTitle>
            <CardDescription>
              Data sources are files your agent reads before it works, so it
              uses your company&apos;s real information. Optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {driveConnected ? (
              <AgentKnowledgeEditor
                agentId={agentId}
                driveConnected={driveConnected}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Drive is not connected yet, so file picking is off for now.
                Your agent still works without data sources. An admin can
                connect Drive under Admin &gt; Integrations.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>What can it use?</CardTitle>
            <CardDescription>
              Tools are what the agent may use while it works. You can always
              turn these off later. These are enforced for real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border rounded-xl border border-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-start gap-3">
                  <Globe className="mt-0.5 size-4 stroke-[1.75] text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">
                      Search the web
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Look things up beyond your files. Good for research and
                      current facts.
                    </span>
                  </span>
                </span>
                <Switch
                  checked={tools.web_search}
                  onCheckedChange={(v) =>
                    setTools((t) => ({ ...t, web_search: v }))
                  }
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-start gap-3">
                  <FileText className="mt-0.5 size-4 stroke-[1.75] text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">
                      Read Drive data sources
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Read the files you picked in the previous step before
                      working.
                    </span>
                  </span>
                </span>
                <Switch
                  checked={tools.drive}
                  onCheckedChange={(v) => setTools((t) => ({ ...t, drive: v }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Any rules it should follow?</CardTitle>
            <CardDescription>
              Guardrails are written rules your agent follows while it works.
              They shape behavior, they don&apos;t lock it down. For hard
              limits, turn tools off in the previous step.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              value={guardrails}
              onChange={(e) => setGuardrails(e.target.value)}
              placeholder="e.g. Never mention competitor names. Always include a call to action at the end."
              rows={5}
            />
            <div className="flex flex-wrap gap-1.5">
              {GUARDRAIL_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setGuardrails((g) => (g ? `${g}\n${s}.` : `${s}.`))
                  }
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>How should results come back?</CardTitle>
            <CardDescription>
              Pick a default. You can change it on any run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {OUTPUT_CARDS.map((card) => {
                const Icon = card.icon
                const needsDrive = card.value !== 'text' && !driveConnected
                const selected = output === card.value
                return (
                  <button
                    key={card.value}
                    type="button"
                    disabled={needsDrive}
                    onClick={() => setOutput(card.value)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                      selected
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40',
                      needsDrive && 'opacity-50'
                    )}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-medium">
                        {card.label}
                        {needsDrive && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            Needs Drive
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {card.caption}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Take it for a test run</CardTitle>
            <CardDescription>
              A test run is a safe trial: nothing is saved and nothing appears
              in your run history.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              value={testBrief}
              onChange={(e) => setTestBrief(e.target.value)}
              placeholder={
                description.trim()
                  ? `e.g. ${description.trim()}`
                  : 'Give it a small task to try.'
              }
              rows={3}
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowInstructions((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDown
                  className={cn(
                    'size-3.5 stroke-[1.75] transition-transform',
                    showInstructions && 'rotate-180'
                  )}
                />
                See the instructions this agent will use
              </button>
              <Button size="sm" onClick={runTest} disabled={testing || !testBrief.trim()}>
                {testing ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Play data-icon="inline-start" />
                )}
                Run test
              </Button>
            </div>
            {showInstructions && (
              <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs whitespace-pre-wrap">
                {assembled || 'No instructions yet.'}
              </pre>
            )}
            {testing && (
              <p className="text-sm text-muted-foreground">
                Working… this usually takes under a minute.
              </p>
            )}
            {testResult && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm whitespace-pre-wrap">{testResult}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  This test result isn&apos;t saved anywhere. Publish the
                  agent, then run it for real to keep the output.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to go</CardTitle>
            <CardDescription>
              Choose who can use {name.trim() || 'this agent'}. You can change
              this any time.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="divide-y divide-border rounded-xl border border-border text-sm">
              {[
                ['Instructions', instructions.trim() ? 'Set' : 'None'],
                ['Tools', [tools.web_search && 'Web search', tools.drive && 'Drive'].filter(Boolean).join(', ') || 'None'],
                ['Guardrails', guardrails.trim() ? 'Set' : 'None'],
                ['Output', OUTPUT_CARDS.find((c) => c.value === output)?.label ?? output],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                  visibility === 'private'
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <Lock className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">
                    Only you and people you add
                  </span>
                  <span className="text-xs text-muted-foreground">
                    It stays private until you decide to share it.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('company')}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                  visibility === 'company'
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <Building2 className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">
                    Everyone at your company
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Anyone can find and run it.
                  </span>
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || busy}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={busy}>
            {busy && (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            )}
            {step === 0
              ? 'Continue to data sources'
              : `Continue to ${STEPS[step + 1].toLowerCase()}`}
          </Button>
        ) : (
          <Button onClick={publish} disabled={busy}>
            {busy && (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            )}
            Publish agent
          </Button>
        )}
      </div>
    </div>
  )
}
