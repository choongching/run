'use client'

import { useState } from 'react'
import { ArrowUp } from 'lucide-react'

import { useTypedPlaceholder } from '@/lib/use-typed-placeholder'
import { cn } from '@/lib/utils'

// The same four jobs the signed-in home types out, so the first thing a
// visitor sees the box say is the first thing they will see it say again
// once they are in.
const EXAMPLES = [
  'Read my inbox each morning and tell me what needs a reply',
  'Answer questions from the documents in my Drive',
  'Draft replies in my voice, for me to approve',
  'Watch a topic each week and write me the short version',
]
const RESTING = 'Describe what you need done...'

const JOBS = [
  { label: 'Inbox triage', prompt: 'Read my inbox each morning and tell me what needs a reply' },
  { label: 'Morning brief', prompt: 'Every weekday at 8, brief me on what came in overnight' },
  { label: 'Docs Q&A', prompt: 'Answer questions from the documents in my Drive' },
  { label: 'Industry news', prompt: 'Watch a topic each week and write me the short version' },
]

// The landing page's call to action is the product's own box, not an email
// field. It submits to the sign-up door with the sentence carried along in
// the URL, so nothing typed here is lost on the way in.
export function LandingComposer({
  className,
  jobs = true,
  placeholder = RESTING,
}: {
  className?: string
  jobs?: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const typed = useTypedPlaceholder({
    examples: EXAMPLES,
    resting: placeholder,
    active: jobs && !focused && value === '',
  })

  return (
    <form action="/register" method="get" className={cn('flex w-full max-w-[620px] flex-col items-center gap-3.5', className)}>
      <div className="flex h-14 w-full items-center gap-3 rounded-lg border border-white/40 bg-card pl-5 pr-2 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.5)] md:h-[60px]">
        <input
          name="prompt"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="What should your first agent do?"
          placeholder={jobs ? typed : placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Get started"
          className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowUp className="size-[18px]" strokeWidth={2} />
        </button>
      </div>
      {jobs && (
        <div className="flex max-w-full gap-2 overflow-x-auto no-scrollbar">
          {JOBS.map((job) => (
            <button
              key={job.label}
              type="button"
              onClick={() => setValue(job.prompt)}
              className="flex h-8 shrink-0 items-center rounded-lg border border-white/22 bg-white/14 px-3 text-sm font-medium text-white transition-colors hover:bg-white/24"
            >
              {job.label}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
