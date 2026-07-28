'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { GmailIcon } from '@/components/icons/gmail'
import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { Button } from '@/components/ui/button'

// The connectors a user can link, and the row that links them.
//
// Lives here rather than in the config panel because a connector is account
// level, not agent level: linking Gmail once serves every agent you own. Three
// surfaces render this same row (the Connectors page, an agent's Configure
// panel, and the inline card a chat shows when it hits a missing connector),
// and they all drive the same /api/connections/[app] endpoints, so the state
// cannot drift between them.

export type ConnectorApp = 'gmail' | 'google_drive'

export type ConnectorState = Record<ConnectorApp, boolean>

export const CONNECTORS = [
  {
    app: 'gmail',
    label: 'Gmail',
    Icon: GmailIcon,
    blurb: 'Read your mail, search threads, and draft replies for your approval.',
  },
  {
    app: 'google_drive',
    label: 'Google Drive',
    Icon: GoogleDriveIcon,
    blurb: 'Find and read your documents, and turn them into new ones.',
  },
] as const satisfies ReadonlyArray<{
  app: ConnectorApp
  label: string
  Icon: (props: { className?: string }) => React.ReactElement
  blurb: string
}>

export function ConnectorList({
  connections,
  onChanged,
  showBlurb = false,
}: {
  connections: ConnectorState
  onChanged: () => void
  showBlurb?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      {CONNECTORS.map(({ app, label, Icon, blurb }) => (
        <ConnectorRow
          key={app}
          app={app}
          label={label}
          Icon={Icon}
          detail={showBlurb ? blurb : undefined}
          connected={connections[app]}
          onChanged={onChanged}
        />
      ))}
    </div>
  )
}

export function ConnectorRow({
  app,
  label,
  Icon,
  detail,
  connected,
  onChanged,
}: {
  app: string
  label: string
  Icon: (props: { className?: string }) => React.ReactElement
  detail?: string
  connected: boolean
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)

  // Open Pipedream Connect in a popup (synchronously, to dodge blockers) and
  // poll until the account lands, then refresh so the row shows Connected.
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
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        )}
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
