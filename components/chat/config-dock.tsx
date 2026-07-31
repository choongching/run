'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

import { ConfigPanel } from '@/components/chat/config-panel'
import type { PanelExtras } from '@/lib/chat/panel-data'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type PanelProps = Omit<
  React.ComponentProps<typeof ConfigPanel>,
  'onClose' | keyof PanelExtras
>

// Docks the configure panel beside the conversation instead of over it.
//
// An overlay with a scrim is right for a decision you finish and dismiss. This
// is not that: you open it because of something the agent just said, and the
// edit you are about to make is judged against that reply. Dimming the reply
// hides the evidence. So the conversation stays live and readable, keeps its
// scroll position, and simply gets narrower.
//
// The reflow is real but small at the sizes this matters: the thread is capped
// at max-w-thread, so on a wide display the column has room to spare and only
// re-centres. It re-wraps only once the remaining space drops below that cap.
//
// Below lg the panel floats over the conversation instead, because pushing on
// a narrow screen would leave a column too thin to read. There is still no
// scrim: it is the same panel, just with nowhere to push to.
export function ConfigDock({
  panel,
  header,
  children,
}: {
  panel: PanelProps
  header: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  // Bumped on every open so the form re-seeds from the server values, the way
  // an unmounting overlay used to give us for free. The panel stays mounted
  // through the closing transition, so it slides out with its content intact
  // rather than collapsing an empty box.
  const [opens, setOpens] = useState(0)

  // The connectors and knowledge the panel shows are fetched when it opens
  // rather than with the conversation. They cost four queries and the panel
  // starts closed, so most chat loads were paying for a surface nobody looked
  // at. Fetching per open also keeps the list honest: connect an app in
  // another tab and the next open reflects it.
  const [extras, setExtras] = useState<PanelExtras | null>(null)
  const [failed, setFailed] = useState(false)

  // Clearing the previous result belongs with the click that asks for a new
  // one, not in the effect: React 19 forbids seeding state synchronously in an
  // effect body, and an event handler is where this actually belongs anyway.
  function loadPanel() {
    setExtras(null)
    setFailed(false)
    setOpens((n) => n + 1)
  }

  useEffect(() => {
    if (!opens) return
    let live = true
    fetch(`/api/agents/${panel.agentId}/config`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
      .then((data: PanelExtras) => live && setExtras(data))
      .catch(() => live && setFailed(true))
    // Cancels the state write, not the request: a reply that lands after the
    // panel has been reopened must not overwrite the newer one.
    return () => {
      live = false
    }
  }, [opens, panel.agentId])

  return (
    // Two cards side by side rather than one card with a panel inside it. The
    // shell steps out of the way (see the [data-shell="split"] rule in
    // globals.css) so the canvas shows through the gap, which is what makes the
    // panel read as its own surface arriving beside the conversation rather
    // than as a region carved out of it.
    // run-chat-type lifts every text token inside the chat surface (thread,
    // header, and docked panel) by 1px; see globals.css for the values.
    <div data-shell="split" className="run-chat-type flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-shell border border-border bg-background px-6 pt-5 md:px-8">
        <header className="mx-auto flex w-full max-w-thread shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
          {header}
          {/* The label follows what the click will do. Saying "Configure"
              while the button closes the panel would be a small lie told
              every time it is open. */}
          <TooltipProvider delay={300}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={open ? 'Close configure' : 'Configure agent'}
                    aria-expanded={open}
                    onClick={() => {
                      if (!open) loadPanel()
                      setOpen((v) => !v)
                    }}
                    className={cn(open && 'bg-muted text-foreground')}
                  />
                }
              >
                <SlidersHorizontal className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {open ? 'Close configure' : 'Configure'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>
        {children}
      </div>

      {/* The track animates; the card inside keeps a fixed width so it slides
          in whole rather than being squashed wider as the space opens. */}
      <aside
        aria-hidden={!open}
        className={cn(
          'shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none',
          'max-lg:fixed max-lg:inset-y-2 max-lg:right-2 max-lg:z-50',
          // Below md the panel is a full-screen takeover (styleguide 5b):
          // the whole viewport, no gutters, no radius. The width track only
          // means anything docked or floating; full-screen sizes from inset.
          'max-md:inset-0',
          open ? 'w-92 max-md:w-auto' : 'w-0'
        )}
      >
        <div className="ml-2 flex h-full w-90 flex-col overflow-hidden rounded-shell border border-border bg-card max-md:ml-0 max-md:w-full max-md:rounded-none max-md:border-0 max-md:pb-[env(safe-area-inset-bottom)]">
          {extras ? (
            <ConfigPanel
              key={`${panel.agentId}:${opens}`}
              {...panel}
              {...extras}
              onClose={() => setOpen(false)}
            />
          ) : (
            <PanelPlaceholder
              failed={failed}
              onClose={() => setOpen(false)}
              onRetry={loadPanel}
            />
          )}
        </div>
      </aside>
    </div>
  )
}

// What the panel shows before its data arrives, and if it never does.
//
// It keeps the real panel's header so the title and the close button do not
// move when the content swaps in, and so the panel can always be dismissed
// even when the fetch failed. A failure says so and offers a retry: silently
// showing an empty Connectors list would read as "nothing is connected", which
// is a different and worse claim than "this did not load".
function PanelPlaceholder({
  failed,
  onClose,
  onRetry,
}: {
  failed: boolean
  onClose: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-4">
        <h2 className="min-w-0 truncate text-sm font-semibold">Configure</h2>
        <TooltipProvider delay={300}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Close the configure panel"
                />
              }
            >
              <X className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              Close
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {failed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            We could not load this agent&rsquo;s settings.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      )}
    </div>
  )
}
