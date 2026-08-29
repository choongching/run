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

// The landing page's call to action is the product's own box, not an email
// field. It submits to the sign-up door with the sentence carried along in
// the URL, so nothing typed here is lost on the way in.
export function LandingComposer({
  className,
  typing = true,
  placeholder = RESTING,
}: {
  className?: string
  typing?: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const typed = useTypedPlaceholder({
    examples: EXAMPLES,
    resting: placeholder,
    active: typing && !focused && value === '',
  })

  return (
    <form action="/register" method="get" className={cn('flex w-full flex-col items-center gap-3.5', className)}>
      {/* The reference's bar (spec 5.4): 275px at rest, 360 while you are
          in it on a tablet or wider, glass over the photograph, the button
          the one solid thing. */}
      <div className="flex h-[54px] w-full max-w-[275px] items-center rounded-[12px] border border-white/10 bg-white/10 p-1.5 backdrop-blur-lg transition-[max-width] duration-300 ease-out md:focus-within:max-w-[360px]">
        <input
          name="prompt"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="What should your first agent do?"
          placeholder={typing ? typed : placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-2 text-base text-white outline-none placeholder:text-white/80 md:px-4"
        />
        <button
          type="submit"
          className="flex h-[42px] shrink-0 items-center rounded-[12px] bg-card px-4 text-[15px] font-medium text-foreground transition-colors hover:bg-white/90"
        >
          Get started
        </button>
      </div>
    </form>
  )
}
