'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, LoaderCircle, Server } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// One-time Managed Agents runtime setup. Unlike the Drive connector there is
// nothing to manage after creation, so this card has no detail modal — just
// a create action that settles into a quiet ready state.

export function EnvironmentCard({
  environmentId,
}: {
  environmentId: string | null
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/environment', { method: 'POST' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error ?? `Setup failed (${res.status})`)
      }
      toast.success('Agent runtime is ready.')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not create the runtime.'
      )
    } finally {
      setCreating(false)
    }
  }

  function copyId() {
    if (!environmentId) return
    navigator.clipboard.writeText(environmentId)
    toast.success('Environment ID copied.')
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
              <Server className="size-4.5 stroke-[1.75] text-muted-foreground" />
            </div>
            <div className="grid gap-1.5">
              <CardTitle>Agent runtime</CardTitle>
              <CardDescription>
                The shared cloud workspace where agents run missions. Set it up
                once and every mission session runs inside it.
              </CardDescription>
            </div>
          </div>
          {environmentId && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-chart-1" />
              Ready
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {environmentId ? (
          <div className="flex min-h-9 items-center justify-between rounded-lg border border-border px-3">
            <span className="text-sm text-muted-foreground">Environment ID</span>
            <span className="flex items-center gap-1">
              <code className="font-mono text-xs">{environmentId}</code>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Copy environment ID"
                onClick={copyId}
              >
                <Copy />
              </Button>
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              One click, no configuration. Missions can&apos;t run without it.
            </p>
            <Button size="sm" onClick={create} disabled={creating}>
              {creating ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              {creating ? 'Setting up...' : 'Create runtime'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
