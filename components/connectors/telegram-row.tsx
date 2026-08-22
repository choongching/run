'use client'

import { useCallback, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { TelegramIcon } from '@/components/icons/telegram'
import { Row, RowTile } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { useConnectPoll } from '@/lib/use-connect-poll'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Telegram on the Connectors page.
//
// It is deliberately NOT a row in the accounts list above, and not part of
// ConnectorList. Everything in that list is something an agent reaches into on
// your behalf; Telegram is the opposite direction, an address Run sends to.
// Filing it under "what your agents can use" would contradict the README's
// answer that no agent has a Telegram tool at all, two screens apart, which is
// exactly how a document loses more trust than the weakness it papers over.
//
// It has a face on this page anyway, for the reason the Brave row does: a
// person should be able to look at one page and see everything their account
// is wired into, including the parts that work differently from the rest. It
// is also the only place to disconnect from the app. Blocking the bot in
// Telegram has always worked, but nobody thinks to go looking there.

type Props = {
  initialPaired: boolean
  // How many routines currently have delivery switched on. Pairing on its own
  // sends nothing, and a row that said "Connected" while every report still
  // sat in the app would be true and useless.
  sendingCount: number
}

export function TelegramRow({ initialPaired, sendingCount }: Props) {
  const [paired, setPaired] = useState(initialPaired)
  const [waiting, setWaiting] = useState(false)
  const [busy, setBusy] = useState(false)

  const readPaired = useCallback(async () => {
    const res = await fetch('/api/telegram/pair')
    if (!res.ok) return false
    const data = (await res.json()) as { paired: boolean }
    setPaired(data.paired)
    return data.paired
  }, [])

  // The shared connect loop: while they are off in Telegram, ask whether the
  // webhook has heard from them, so nobody has to come back and refresh to
  // find out it worked. Pairing happens on a PHONE, so the tab is not just
  // hidden, it is abandoned; the hook's visibility recheck is what makes
  // coming back to the tab land instantly instead of waiting out a throttled
  // timer.
  useConnectPoll({
    active: waiting,
    check: readPaired,
    onDone: () => {
      setWaiting(false)
      toast.success('Telegram connected.')
    },
    onTimeout: () => setWaiting(false),
  })

  async function connect() {
    if (busy) return
    setBusy(true)
    try {
      // Minted per press, because the link expires. Opened from the click
      // that asked for it so the browser does not treat it as a popup.
      const res = await fetch('/api/telegram/pair', { method: 'POST' })
      if (!res.ok) {
        toast.error("We couldn't start connecting Telegram. Please try again.")
        return
      }
      const { link } = (await res.json()) as { link: string }
      setWaiting(true)
      window.open(link, '_blank', 'noopener,noreferrer')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/telegram/pair', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setPaired(false)
      setWaiting(false)
      toast('Telegram disconnected.')
    } catch {
      toast.error("We couldn't disconnect Telegram. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  // What the row IS, first and always. An earlier version led with a count of
  // routines, which reads as a status readout and tells someone who has never
  // switched delivery on nothing about what is being offered.
  //
  // The count is gone. It is a fact about your routines, not about Telegram,
  // and it belongs on the Routines page where those rows already say it. The
  // one state that still speaks is paired with nothing sending, and that is
  // not a count: it is the case that looks finished and is not, so it follows
  // the app's rule that status speaks only for the exception.
  const detail =
    paired && sendingCount === 0
      ? 'Get your routine reports as Telegram messages. No routine sends here yet.'
      : 'Get your routine reports as Telegram messages.'

  return (
    <Row
      lead={
        <RowTile>
          <TelegramIcon className="size-5" />
        </RowTile>
      }
      title={
        <>
          Telegram
          {/* The app-wide status recipe: same check in both states, colour
              carries it, the word lives in the tooltip and the aria-label. */}
          <TooltipProvider delay={300}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    role="img"
                    aria-label={paired ? 'Connected' : 'Not connected'}
                    className="flex shrink-0 items-center"
                  />
                }
              >
                <Check
                  className={
                    paired
                      ? 'size-3.5 text-primary'
                      : 'size-3.5 text-muted-foreground/40'
                  }
                />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {paired ? 'Connected' : 'Not connected yet'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      }
      detail={detail}
      trailing={
        <TooltipProvider delay={300}>
        <Tooltip>
          {paired ? (
            <>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="run-tap"
                    onClick={disconnect}
                    disabled={busy}
                  />
                }
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : 'Disconnect'}
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Your reports will wait in the app again
              </TooltipContent>
            </>
          ) : (
            <>
              <TooltipTrigger
                render={
                  <Button
                    size="sm"
                    className="run-tap"
                    onClick={connect}
                    disabled={busy || waiting}
                  />
                }
              >
                {(busy || waiting) && <Loader2 className="size-3.5 animate-spin" />}
                {waiting ? 'Waiting' : 'Connect'}
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {waiting
                  ? 'Press Start in Telegram, this updates itself'
                  : 'Send your reports to your phone'}
              </TooltipContent>
            </>
          )}
          </Tooltip>
        </TooltipProvider>
      }
    />
  )
}
