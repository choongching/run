'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AgentsIcon } from '@/components/nav-icons'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

export type SquadMember = {
  agent_id: string
  name: string
  description: string | null
  custom_instructions: string | null
}

export function AgentPersonaliseDrawer({
  member,
  open,
  onOpenChange,
}: {
  member: SquadMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The body remounts on every open (closed sheet content is
          unmounted), so useState initializers seed the textarea fresh. */}
      <DrawerBody
        key={member?.agent_id ?? 'none'}
        member={member}
        onOpenChange={onOpenChange}
      />
    </Sheet>
  )
}

function DrawerBody({
  member,
  onOpenChange,
}: {
  member: SquadMember | null
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [instructions, setInstructions] = useState(
    member?.custom_instructions ?? ''
  )
  const [saving, setSaving] = useState(false)

  const dirty = instructions.trim() !== (member?.custom_instructions ?? '')

  async function save() {
    if (!member) return
    setSaving(true)
    try {
      const res = await fetch('/api/squad', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: member.agent_id,
          custom_instructions: instructions,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error ?? `Save failed (${res.status})`)
      }
      toast.success('Your instructions are saved.')
      router.refresh()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save your instructions.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <SheetContent className="gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
              <AgentsIcon className="size-4.5 stroke-[1.75] text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">{member?.name}</SheetTitle>
              <SheetDescription>
                {member?.description?.trim() || 'An agent in your squad.'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-2">
            <Label htmlFor="squad-instructions">Your instructions</Label>
            <Textarea
              id="squad-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Anything this agent should always know when working for you: your team, your formats, your preferences."
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Added to every mission you run with {member?.name ?? 'this agent'},
              on top of the company voice. Only you see these.
            </p>
          </div>
        </div>

        <SheetFooter className="border-t border-border p-5">
          <Button
            className="w-full"
            onClick={save}
            disabled={!dirty || saving}
          >
            {saving && (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            )}
            {dirty ? 'Save instructions' : 'Saved'}
          </Button>
        </SheetFooter>
    </SheetContent>
  )
}
