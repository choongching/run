'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { ConfigPanel } from '@/components/chat/config-panel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PanelProps = Omit<React.ComponentProps<typeof ConfigPanel>, 'onClose'>

// Docks the configure panel beside the conversation instead of over it.
//
// An overlay with a scrim is right for a decision you finish and dismiss. This
// is not that: you open it because of something the agent just said, and the
// edit you are about to make is judged against that reply. Dimming the reply
// hides the evidence. So the conversation stays live and readable, keeps its
// scroll position, and simply gets narrower.
//
// The reflow is real but small at the sizes this matters: the thread is capped
// at max-w-3xl, so on a wide display the column has room to spare and only
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

  return (
    // Two cards side by side rather than one card with a panel inside it. The
    // shell steps out of the way (see the [data-shell="split"] rule in
    // globals.css) so the canvas shows through the gap, which is what makes the
    // panel read as its own surface arriving beside the conversation rather
    // than as a region carved out of it.
    <div data-shell="split" className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-shell border border-border bg-background px-6 pt-5 shadow-sm md:px-8">
        <header className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
          {header}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Configure agent"
            aria-expanded={open}
            onClick={() => {
              if (!open) setOpens((n) => n + 1)
              setOpen((v) => !v)
            }}
            className={cn(open && 'bg-muted text-foreground')}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
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
          open ? 'w-92' : 'w-0'
        )}
      >
        <div className="ml-2 flex h-full w-90 flex-col overflow-hidden rounded-shell border border-border bg-card shadow-sm">
          <ConfigPanel
            key={`${panel.agentId}:${opens}`}
            {...panel}
            onClose={() => setOpen(false)}
          />
        </div>
      </aside>
    </div>
  )
}
