'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { GmailIcon } from '@/components/icons/gmail'
import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { JinaIcon } from '@/components/icons/jina'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// The connectors a user can link, and the row that links them.
//
// Lives here rather than in the config panel because a connector is account
// level, not agent level: linking Gmail once serves every agent you own. Three
// surfaces render this same row (the Connectors page, an agent's Configure
// panel, and the inline card a chat shows when it hits a missing connector),
// and they all drive the same /api/connections/[app] endpoints, so the state
// cannot drift between them.

export type ConnectorApp = 'gmail' | 'google_drive' | 'jina_ai'

export type ConnectorState = Record<ConnectorApp, boolean>

export const CONNECTORS = [
  {
    app: 'gmail',
    label: 'Gmail',
    Icon: GmailIcon,
    // Same rule as Drive below: no approval clause on the row. "Draft" is
    // already the honest word, since there is no send tool at all.
    blurb: 'Read your mail, search threads, and draft replies.',
  },
  {
    app: 'google_drive',
    label: 'Google Drive',
    Icon: GoogleDriveIcon,
    // Names the file types, because that is the part people actually wonder
    // about. The old line promised "turn them into new ones", which was not
    // true: create_document makes a Run document, and nothing an agent writes
    // lands back in Drive.
    //
    // No approval clause. Approval is not a fact about Drive, it is how every
    // write in Run works, and it is stated once at the foot of the page.
    // Repeating it per row makes it sound like a per-connector quirk.
    blurb:
      'Read your documents, sheets and PDFs, and rename, move or file them away.',
  },
  {
    app: 'jina_ai',
    // Says what Jina IS first, then what connecting buys. An earlier version
    // opened on the benefit and never named the thing, which reads fine to
    // anyone who already knows Jina and tells a stranger nothing.
    label: 'Jina',
    Icon: JinaIcon,
    blurb:
      'Another web search engine. Connect your own Jina account and searches stop counting against your monthly limit.',
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
  only,
}: {
  connections: ConnectorState
  onChanged: () => void
  showBlurb?: boolean
  // Which of the catalogue to render, in catalogue order. The Connectors page
  // splits them into groups; the Configure panel and the connect card want the
  // whole list, so leaving this out keeps the old behaviour.
  only?: ReadonlyArray<ConnectorApp>
}) {
  const rows = only
    ? CONNECTORS.filter((c) => only.includes(c.app))
    : CONNECTORS
  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ app, label, Icon, blurb }) => (
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
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">{label}</p>
          {/* State is one icon beside the name, words on hover: the same
              check in both states, green when connected and faint ink when
              not, so colour alone carries the state (founder's call after a
              dashed-circle attempt read as weird). The tooltip carries the
              label the row no longer shows; screen readers get it from the
              aria-label. */}
          <TooltipProvider delay={300}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    role="img"
                    aria-label={connected ? 'Connected' : 'Not connected'}
                    className="flex shrink-0 items-center"
                  />
                }
              >
                <Check
                  className={
                    connected
                      ? 'size-3.5 text-primary'
                      : 'size-3.5 text-muted-foreground/40'
                  }
                />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {connected ? 'Connected' : 'Not connected yet'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        )}
      </div>
      {/* One line on hover saying what the click does, in consequences, not
          mechanics. Same recipe as the configure toggle in config-dock. */}
      <TooltipProvider delay={300}>
        <Tooltip>
          {connected ? (
            <>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disconnect}
                    disabled={busy}
                  />
                }
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  'Disconnect'
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Your agents will stop using this account
              </TooltipContent>
            </>
          ) : (
            <>
              <TooltipTrigger
                render={<Button size="sm" onClick={connect} disabled={busy} />}
              >
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                {busy ? 'Connecting' : 'Connect'}
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Sign in to give your agents access
              </TooltipContent>
            </>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
