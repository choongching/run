'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

import { GmailIcon } from '@/components/icons/gmail'
import { GoogleDriveIcon } from '@/components/icons/google-drive'

const APPS = {
  gmail: { label: 'Gmail', Icon: GmailIcon },
  google_drive: { label: 'Google Drive', Icon: GoogleDriveIcon },
} as const

type ConnectApp = keyof typeof APPS

// Inline connect card shown in the thread when the agent needs a connection
// the user hasn't made. Opens Pipedream Connect in a popup and polls until the
// account lands, then calls onConnected.
export function ConnectCard({
  app,
  onConnected,
}: {
  app: string
  onConnected: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const meta = APPS[app as ConnectApp]
  if (!meta) return null
  const { label, Icon } = meta

  async function connect() {
    if (status === 'connecting') return
    setStatus('connecting')
    // Open the popup synchronously (inside the click) to dodge blockers, then
    // point it at the connect link once we have it.
    const popup = window.open('', 'run_connect', 'width=600,height=720')
    try {
      const res = await fetch(`/api/connections/${app}`)
      const data = await res.json()
      if (!res.ok || !data.connect_url) throw new Error(data.error ?? 'failed')
      if (popup) popup.location.href = data.connect_url
    } catch {
      popup?.close()
      setStatus('idle')
      return
    }

    const started = Date.now()
    const poll = setInterval(async () => {
      if (Date.now() - started > 180_000) {
        clearInterval(poll)
        setStatus('idle')
        return
      }
      try {
        const res = await fetch(`/api/connections/${app}`, { method: 'POST' })
        const data = await res.json()
        if (data.connected) {
          clearInterval(poll)
          popup?.close()
          setStatus('connected')
          onConnected()
        }
      } catch {
        // Keep polling until timeout.
      }
    }, 2000)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Connect {label}</p>
          <p className="text-xs text-muted-foreground">
            So this agent can work with your {label}.
          </p>
        </div>
        {status === 'connected' ? (
          <span className="flex items-center gap-1.5 text-sm text-primary">
            <Check className="size-4" />
            Connected
          </span>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={status === 'connecting'}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-60"
          >
            {status === 'connecting' && <Loader2 className="size-3.5 animate-spin" />}
            {status === 'connecting' ? 'Connecting' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  )
}
