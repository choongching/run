'use client'

import { useEffect, useRef, useState } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// A label that clips with an ellipsis and reveals its full text on hover, but
// only when it is actually clipped.
//
// The measurement matters: showing the tooltip unconditionally means every
// short name gets a black box repeating what is already on screen, which reads
// as noise and trains people to ignore it. A tooltip that appears only when
// something is hidden is a promise that hovering tells you something new.
//
// The trigger stays mounted whether or not the text is clipped, and only the
// content is conditional. An earlier version swapped the plain span for a
// trigger once it measured as clipped, which handed the node to a different
// element, lost the ref, and measured false again on the next pass.
export function TruncatedLabel({
  text,
  className,
  side = 'right',
}: {
  text: string
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [clipped, setClipped] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // ResizeObserver fires once on observe, so the first measurement happens in
    // the callback rather than as a set-state during the effect body. Width is
    // watched rather than measured once because the sidebar and the panels it
    // sits in resize, and a name can cross the threshold either way.
    const observer = new ResizeObserver(() => {
      setClipped(el.scrollWidth > el.clientWidth)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [text])

  return (
    <TooltipProvider delay={400}>
      <Tooltip>
        <TooltipTrigger
          render={<span ref={ref} className={cn('truncate', className)} />}
        >
          {text}
        </TooltipTrigger>
        {clipped && (
          <TooltipContent side={side} sideOffset={8}>
            {text}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
