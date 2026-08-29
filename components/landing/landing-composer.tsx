'use client'

import { useState } from 'react'
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
    <form action="/register" method="get" className={cn('flex w-full flex-col items-center gap-3.5', className)}>
      {/* A glass bar over the photograph, the reference's shape: the box
          is see-through, the button is the one solid thing. It widens a
          little when you are in it. */}
      <div className="flex h-[54px] w-full max-w-[420px] items-center gap-2 rounded-[12px] border border-white/10 bg-white/10 p-1.5 backdrop-blur-lg transition-[max-width] duration-300 ease-out focus-within:max-w-[520px]">
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
          className="min-w-0 flex-1 bg-transparent px-3 text-base text-white outline-none placeholder:text-white/80"
        />
        <button
          type="submit"
          className="flex h-[42px] shrink-0 items-center rounded-[12px] bg-card px-4 text-[15px] font-medium text-foreground transition-colors hover:bg-white/90"
        >
          Get started
        </button>
      </div>
      {jobs && (
        <div className="flex max-w-full gap-2 overflow-x-auto no-scrollbar">
          {JOBS.map((job) => (
            <button
              key={job.label}
              type="button"
              onClick={() => setValue(job.prompt)}
              className="flex h-8 shrink-0 items-center rounded-lg bg-white/12 px-3 text-sm font-medium text-white transition-colors hover:bg-white/22"
            >
              {job.label}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
