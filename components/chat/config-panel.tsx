'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { deleteAgent, updateAgentConfig } from '@/app/actions/agents'
import {
  KnowledgeSection,
  type KnowledgeItem,
} from '@/components/chat/knowledge-section'
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
import { Textarea } from '@/components/ui/textarea'
import {
  ConnectorList,
  type ConnectorState,
} from '@/components/connectors/connector-list'
import { PERSONALITIES } from '@/lib/agents/personalities'
import type { SetupAnswer } from '@/lib/chat/onboarding'

// Plain-language model tiers. The ids mirror AGENT_MODELS in lib/anthropic;
// the server action validates against that canonical list on save. Defined
// here (not imported) so the Anthropic SDK never gets bundled into the client.
const MODEL_CHOICES = [
  { id: 'claude-sonnet-5', tier: 'Balanced', sub: 'Claude Sonnet 5', hint: 'Recommended for most agents' },
  { id: 'claude-opus-4-8', tier: 'Deeper', sub: 'Claude Opus 4.8', hint: 'Most capable, a little slower' },
  { id: 'claude-haiku-4-5', tier: 'Faster', sub: 'Claude Haiku 4.5', hint: 'Quick and light' },
] as const

// The chat-side config panel: what talking to the agent configured, shown so
// it can be changed. Name and instructions are edited and saved together;
// connectors act immediately; the setup answers are a receipt of the first-run
// interview.
//
// It docks beside the conversation rather than covering it (see ConfigDock).
// That is the point: the reason to open this is usually something the agent
// just said, and a panel that dims the reply hides the evidence you are acting
// on.
export function ConfigPanel({
  agentId,
  agentName,
  instructions,
  model,
  personality,
  preferences,
  connections,
  knowledge,
  knowledgeLibrary,
  isOwner,
  onClose,
}: {
  agentId: string
  agentName: string
  instructions: string
  model: string
  personality: string
  preferences: SetupAnswer[]
  connections: ConnectorState
  knowledge: KnowledgeItem[]
  knowledgeLibrary: KnowledgeItem[]
  isOwner: boolean
  onClose: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 pt-5 pb-3">
        <h2 className="min-w-0 truncate text-sm font-semibold">Configure</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close the configure panel"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <ConfigPanelBody
        agentId={agentId}
        agentName={agentName}
        instructions={instructions}
        model={model}
        personality={personality}
        preferences={preferences}
        connections={connections}
        knowledge={knowledge}
        knowledgeLibrary={knowledgeLibrary}
        isOwner={isOwner}
      />
    </div>
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
  knowledge,
  knowledgeLibrary,
  isOwner,
}: {
  agentId: string
  agentName: string
  instructions: string
  model: string
  personality: string
  preferences: SetupAnswer[]
  connections: ConnectorState
  knowledge: KnowledgeItem[]
  knowledgeLibrary: KnowledgeItem[]
  isOwner: boolean
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
        {/* A non-owner can read the setup but not change it. The server
            already refuses their writes; this is so the panel stops offering
            what it will not accept. Connections stay live because those are
            the reader's own accounts, not the owner's. */}
        {!isOwner && (
          <p className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
            This agent belongs to someone else. You can see how it is set up,
            and only they can change it.
          </p>
        )}

        {/* Profile: what it's called and how it sounds. */}
        <AccordionSection
          title="Profile"
          hint="What it's called and how it sounds."
          defaultOpen
        >
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              aria-label="Agent name"
              disabled={!isOwner}
              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </Field>
          <Field label="Personality">
            <Select
              value={chosenPersonality}
              onValueChange={(v) => {
                if (v) setChosenPersonality(v)
              }}
              disabled={!isOwner}
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
          </Field>
        </AccordionSection>

        {/* Behavior: its job, and the model it runs on. */}
        <AccordionSection
          title="Behavior"
          hint="Its job, and the model it runs on."
        >
          <Field label="Instructions">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              aria-label="Agent instructions"
              disabled={!isOwner}
              className="min-h-32 resize-y text-sm disabled:cursor-not-allowed disabled:opacity-60"
            />
          </Field>
          <Field label="Model">
            <div className="flex flex-col gap-2">
            {MODEL_CHOICES.map((choice) => {
              const selected = chosenModel === choice.id
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setChosenModel(choice.id)}
                  aria-pressed={selected}
                  disabled={!isOwner}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card enabled:hover:bg-muted'
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
          </Field>
        </AccordionSection>

        {/* Knowledge: what it always knows, before anyone asks it anything. */}
        <AccordionSection
          title="Knowledge"
          hint="Things it should always know: how you write, key facts, your terms. It carries these into every message."
        >
          <KnowledgeSection
            agentId={agentId}
            sources={knowledge}
            library={knowledgeLibrary}
            canEdit={isOwner}
          />
        </AccordionSection>

        <AccordionSection
          title="Connectors"
          hint="Your own accounts. The agent reads freely and asks before it writes."
        >
          <div className="flex flex-col gap-2">
            <ConnectorList
              connections={connections}
              onChanged={() => router.refresh()}
            />
            <p className="px-0.5 text-xs text-muted-foreground">
              These are yours rather than this agent&apos;s, so every agent you own shares
              them. Manage them all under Connectors. Web search is always on.
            </p>
          </div>
        </AccordionSection>

        {preferences.length > 0 && (
          <AccordionSection
            title="Setup answers"
            hint="What you told this agent when you first set it up."
          >
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

        {isOwner && (
          <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-card px-3.5 py-3">
            <p className="min-w-0 text-sm font-medium">Delete agent</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="mt-auto flex items-center justify-end gap-2 border-t border-border p-4">
          <Button onClick={save} disabled={!canSave}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? 'Saving' : 'Save changes'}
          </Button>
        </div>
      )}

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

// A labeled field inside a grouped accordion section, so several related
// controls can share one section while each stays clearly labeled.
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </div>
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
