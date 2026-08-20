'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Where a routine's reports go.
//
// Two facts decide what this shows: whether the PERSON has paired Telegram
// (one pairing serves every routine they own) and whether THIS routine sends.
// The interesting state is the pair of them disagreeing: delivery on, pairing
// never finished, which sends nothing and, without saying so here, says so
// nowhere the person is looking.
//
// The switch auto-saves. No Save button, no dirty state, safe to close the
// sheet at any moment. That is not convenience: pairing is an irreversible
// external act that lands on someone's phone the instant they press Start, so
// a switch that waited for Save would let half of one interaction commit and
// the other half sit unsaved.

type Props = {
  routineId: string
  initialOn: boolean
  initialPaired: boolean
}

// Pairing arrives as a prop, read on the server in the same round trip as the
// routines themselves. Fetching it here instead would flash "not connected" at
// someone who is, and would trip the set-state-in-effect rule for the sake of
// a lookup the page already had cheap access to.
export function DeliveryField({ routineId, initialOn, initialPaired }: Props) {
  const [on, setOn] = useState(initialOn)
  const [saving, setSaving] = useState(false)
  const [paired, setPaired] = useState(initialPaired)
  const [waiting, setWaiting] = useState(false)

  const readPaired = useCallback(async () => {
    const res = await fetch('/api/telegram/pair')
    if (!res.ok) return false
    const data = (await res.json()) as { paired: boolean }
    setPaired(data.paired)
    return data.paired
  }, [])

  // While they are off in Telegram, ask every few seconds whether the webhook
  // has heard from them. Same shape as the connector connect loop: the person
  // should never have to come back and refresh to find out it worked.
  useEffect(() => {
    if (!waiting) return
    const id = setInterval(async () => {
      if (await readPaired()) {
        setWaiting(false)
        toast.success('Telegram connected')
      }
    }, 2500)
    // Stop after five minutes rather than polling this tab forever.
    const stop = setTimeout(() => setWaiting(false), 5 * 60 * 1000)
    return () => {
      clearInterval(id)
      clearTimeout(stop)
    }
  }, [waiting, readPaired])

  async function toggle(next: boolean) {
    setOn(next)
    setSaving(true)
    try {
      const res = await fetch(`/api/routines/${routineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverTelegram: next }),
      })
      if (!res.ok) throw new Error()
      // Turning it on when nobody has paired is the moment to offer the link,
      // rather than making them find a second control.
      if (next && !paired) void openLink()
    } catch {
      setOn(!next)
      toast.error('That did not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function openLink() {
    // Opened from the click that asked for it, so the browser does not treat
    // it as a popup. The link is minted per press because it expires.
    const res = await fetch('/api/telegram/pair', { method: 'POST' })
    if (!res.ok) {
      toast.error('Telegram is not available right now.')
      return
    }
    const { link } = (await res.json()) as { link: string }
    setWaiting(true)
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  const showConnect = on && !paired

  return (
    <section>
      <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
        Where reports go
      </h3>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Send to Telegram</span>
            {paired ? (
              <span
                className={
                  on
                    ? 'inline-flex items-center gap-1 text-xs font-medium text-primary'
                    : 'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground/55'
                }
              >
                <Check className="size-3" aria-hidden />
                connected
              </span>
            ) : null}
            {showConnect && waiting ? (
              <span className="text-xs font-medium text-chart-4">
                not finished
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] leading-[19px] text-muted-foreground">
            {paired && on
              ? 'They arrive the moment a run finishes. When there is nothing to say, nothing arrives.'
              : paired
                ? 'This one stays here. Your other routines are not affected.'
                : 'Reports come to you, instead of waiting here.'}
          </p>
        </div>

        {/* The tooltip owns a wrapping span rather than the Switch itself.
            Merging two base-ui roots onto one element drops the tooltip's
            pointer handlers and it silently never opens, which is the same
            trap the styleguide records for putting a tooltip on a
            DialogTrigger. Verified in the browser: merged does nothing,
            wrapped works. */}
        <TooltipProvider delay={300}>
          <Tooltip>
            <TooltipTrigger render={<span className="mt-0.5 inline-flex shrink-0" />}>
              <Switch
                checked={on}
                disabled={saving}
                onCheckedChange={toggle}
                aria-label="Send this routine's reports to Telegram"
              />
            </TooltipTrigger>
            <TooltipContent>
              {on ? 'Keep reports in the app only' : 'Send reports to your phone'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {showConnect ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3.5">
          {waiting ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {waiting ? 'Waiting for Telegram' : 'Connect Telegram'}
            </p>
            <p className="mt-0.5 text-[13px] leading-[19px] text-muted-foreground">
              {waiting ? (
                <>
                  Press Start in Telegram. This updates itself.{' '}
                  <button
                    type="button"
                    onClick={openLink}
                    className="text-primary underline underline-offset-4"
                  >
                    Open again
                  </button>
                </>
              ) : (
                'One tap in Telegram. Stop it whenever you like.'
              )}
            </p>
          </div>
          {waiting ? null : (
            <Button onClick={openLink} className="shrink-0 max-md:min-h-11">
              Connect
            </Button>
          )}
        </div>
      ) : null}
    </section>
  )
}
