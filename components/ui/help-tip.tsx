'use client'

import { CircleQuestionMark } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// A question mark beside a field heading, holding the one thing about that
// field a person cannot deduce by looking at it.
//
// Lived in routine-sheet until a second field wanted one. One was a special
// case; two is a shape, and the third would have drifted.
//
// The rule for what goes in here is narrow, and it is the reason this is not a
// general help affordance: it states a FACT ABOUT THE SYSTEM, never advice on
// how to write well. "The chat history is not included" is something the
// machinery does and nobody can guess. "Be specific and clear" is prompt
// coaching, and a product that needs to coach its users on prompting has a
// different problem than a tooltip can fix.
export function HelpTip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="What this means"
              className="inline-flex text-muted-foreground/70 hover:text-foreground"
            />
          }
        >
          <CircleQuestionMark className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {/* A plain block, one sentence or two. Anything longer belongs in
              the interface, not behind a question mark. */}
          <span className="block max-w-56">{children}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
