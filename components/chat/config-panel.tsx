'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { deleteAgent, updateAgentConfig } from '@/app/actions/agents'
import { GmailIcon } from '@/components/icons/gmail'
import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { PERSONALITIES } from '@/lib/agents/personalities'
import type { SetupAnswer } from '@/lib/chat/onboarding'

export type ConnectionState = { gmail: boolean; google_drive: boolean }

const APPS = [
  { app: 'gmail', label: 'Gmail', Icon: GmailIcon },
  { app: 'google_drive', label: 'Google Drive', Icon: GoogleDriveIcon },
] as const

// Plain-language model tiers. The ids mirror AGENT_MODELS in lib/anthropic;
// the server action validates against that canonical list on save. Defined
// here (not imported) so the Anthropic SDK never gets bundled into the client.
const MODEL_CHOICES = [
  { id: 'claude-sonnet-5', tier: 'Balanced', sub: 'Claude Sonnet 5', hint: 'Recommended for most agents' },
  { id: 'claude-opus-4-8', tier: 'Deeper', sub: 'Claude Opus 4.8', hint: 'Most capable, a little slower' },
  { id: 'claude-haiku-4-5', tier: 'Faster', sub: 'Claude Haiku 4.5', hint: 'Quick and light' },
] as const

// The chat-side config panel: a slide-over showing (and editing) what talking
// to the agent configured. Name and instructions are edited and saved
// together; connections act immediately; the setup answers are a receipt of
// the first-run interview. The trigger sits in the chat header.
export function ConfigPanel({
  agentId,
  agentName,
  instructions,
  model,
  personality,
  preferences,
  connections,
}: {
  agentId: string
  agentName: string
  instructions: string
  model: string
  personality: string
  preferences: SetupAnswer[]
  connections: ConnectionState
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Configure agent" />
        }
      >
        <SlidersHorizontal className="size-4" />
      </SheetTrigger>
      <SheetContent side="right" className="gap-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Configure</SheetTitle>
          <SheetDescription>
            Everything you set up by chatting. Edit it any time.
          </SheetDescription>
        </SheetHeader>
        {/* Keyed by agent so the form re-seeds fresh whenever the panel opens
            for a different agent. */}
        <ConfigPanelBody
          key={agentId}
          agentId={agentId}
          agentName={agentName}
          instructions={instructions}
          model={model}
          personality={personality}
          preferences={preferences}
          connections={connections}
        />
      </SheetContent>
    </Sheet>
  )
}

function ConfigPanelBody({
  agentId,
  agentName,
  instructions,
  model,
  personality,
  preferences,
  connections,
}: {
  agentId: string
  agentName: string
  instructions: string
  model: string
  personality: string
  preferences: SetupAnswer[]
  connections: ConnectionState
}) {
  const router = useRouter()
  const [name, setName] = useState(agentName)
  const [draft, setDraft] = useState(instructions)
  const [chosenModel, setChosenModel] = useState(model)
  const [chosenPersonality, setChosenPersonality] = useState(personality)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const trimmedName = name.trim().replace(/\s+/g, ' ')
  const dirty =
    trimmedName !== agentName.trim() ||
    draft.trim() !== instructions.trim() ||
    chosenModel !== model ||
    chosenPersonality !== personality
  const canSave = dirty && trimmedName.length > 0 && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      await updateAgentConfig(agentId, {
        name: trimmedName,
        instructions: draft,
        model: chosenModel,
        personality: chosenPersonality,
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setDeleting(true)
    try {
      await deleteAgent(agentId)
      toast(`${agentName} deleted.`)
      router.push('/')
    } catch {
      setDeleting(false)
      toast.error("We couldn't delete this agent. Please try again.")
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4">
        <AccordionSection title="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            aria-label="Agent name"
            className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </AccordionSection>

        <AccordionSection
          title="Instructions"
          hint="What the agent should do and how. Saved when you press Save."
          defaultOpen
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={7}
            aria-label="Agent instructions"
            className="min-h-32 resize-y text-sm"
          />
        </AccordionSection>

        <AccordionSection
          title="Model"
          hint="How much horsepower the agent runs on."
        >
          <div className="flex flex-col gap-2">
            {MODEL_CHOICES.map((choice) => {
              const selected = chosenModel === choice.id
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setChosenModel(choice.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      selected ? 'border-primary' : 'border-input'
                    }`}
                  >
                    {selected && (
                      <span className="size-2 rounded-full bg-primary" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{choice.tier}</span>
                      <span className="text-xs text-muted-foreground">
                        {choice.sub}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {choice.hint}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </AccordionSection>

        <AccordionSection
          title="Personality"
          hint="How the agent sounds when it replies."
        >
          <Select
            value={chosenPersonality}
            onValueChange={(v) => {
              if (v) setChosenPersonality(v)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value) =>
                  PERSONALITIES.find((p) => p.id === value)?.label ?? 'Balanced'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PERSONALITIES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {PERSONALITIES.find((p) => p.id === chosenPersonality)?.description}
          </p>
        </AccordionSection>

        <AccordionSection
          title="Connections"
          hint="Your own accounts. The agent reads freely and asks before it writes."
        >
          <div className="flex flex-col gap-2">
            {APPS.map(({ app, label, Icon }) => (
              <ConnectionRow
                key={app}
                app={app}
                label={label}
                Icon={Icon}
                connected={connections[app]}
                onChanged={() => router.refresh()}
              />
            ))}
            <p className="px-0.5 text-xs text-muted-foreground">
              Web search is always on.
            </p>
          </div>
        </AccordionSection>

        {preferences.length > 0 && (
          <AccordionSection title="Setup answers">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" />
                From your first conversation
              </div>
              <dl className="divide-y divide-border">
                {preferences.map((pref, i) => (
                  <div key={i} className="px-3 py-2.5">
                    <dt className="text-xs text-muted-foreground">{pref.q}</dt>
                    <dd className="mt-0.5 text-sm">{pref.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </AccordionSection>
        )}

        <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-card px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Delete agent</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Removes it and its chat history for good.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-end gap-2 border-t border-border p-4">
        <Button onClick={save} disabled={!canSave}>
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? 'Saving' : 'Save changes'}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {agentName}?</DialogTitle>
            <DialogDescription>
              This permanently removes the agent and its entire chat history. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting && <Loader2 className="size-3.5 animate-spin" />}
              {deleting ? 'Deleting' : 'Delete agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// A collapsible section of the config panel. Each config group is one of these
// so a long panel stays scannable; the title bar toggles the content open.
function AccordionSection({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string
  hint?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left hover:bg-muted/40"
      >
        <span className="text-sm font-medium">{title}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-2.5 border-t border-border px-3.5 pt-3 pb-3.5">
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {children}
        </div>
      )}
    </div>
  )
}

function ConnectionRow({
  app,
  label,
  Icon,
  connected,
  onChanged,
}: {
  app: string
  label: string
  Icon: (props: { className?: string }) => React.ReactElement
  connected: boolean
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)

  // Open Pipedream Connect in a popup (synchronously, to dodge blockers) and
  // poll until the account lands, then refresh so the panel shows Connected.
  async function connect() {
    if (busy) return
    setBusy(true)
    const popup = window.open('', 'run_connect', 'width=600,height=720')
    try {
      const res = await fetch(`/api/connections/${app}`)
      const data = await res.json()
      if (!res.ok || !data.connect_url) throw new Error(data.error ?? 'failed')
      if (popup) popup.location.href = data.connect_url
    } catch {
      popup?.close()
      setBusy(false)
      toast.error(`We couldn't start connecting ${label}. Please try again.`)
      return
    }

    const started = Date.now()
    const poll = setInterval(async () => {
      if (Date.now() - started > 180_000) {
        clearInterval(poll)
        setBusy(false)
        toast.error(`Connecting ${label} didn't finish. Please try again.`)
        return
      }
      try {
        const res = await fetch(`/api/connections/${app}`, { method: 'POST' })
        const data = await res.json()
        if (data.connected) {
          clearInterval(poll)
          popup?.close()
          setBusy(false)
          toast.success(`${label} connected.`)
          onChanged()
        }
      } catch {
        // Keep polling until timeout.
      }
    }, 2000)
  }

  async function disconnect() {
    if (busy) return
    setBusy(true)
    try {
      await fetch(`/api/connections/${app}`, { method: 'DELETE' })
      toast(`${label} disconnected.`)
      onChanged()
    } catch {
      toast.error(`We couldn't disconnect ${label}. Please try again.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {connected ? 'Connected' : 'Not connected'}
        </p>
      </div>
      {connected ? (
        <Button variant="ghost" size="sm" onClick={disconnect} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : 'Disconnect'}
        </Button>
      ) : (
        <Button size="sm" onClick={connect} disabled={busy}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          {busy ? 'Connecting' : 'Connect'}
        </Button>
      )}
    </div>
  )
}
