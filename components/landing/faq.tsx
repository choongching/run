'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// From the README's security FAQ: real questions, answered by reading the
// code rather than from memory.
const QUESTIONS = [
  {
    q: 'Can it send an email without asking me?',
    a: 'No. Sending is not a tool it has, so nothing it reads, and nothing anyone tells it, can make that happen.',
  },
  {
    q: 'What keeps deciding and doing apart?',
    a: 'They happen on different computers. The model only asks; Run’s own server reads freely and stops anything else at a card you see first.',
  },
  {
    q: 'Could something trick it into approving for me?',
    a: 'No. Only your click on Approve counts, and it approves exactly what was on the card, nothing else.',
  },
  {
    q: 'So what is the worst that can happen?',
    a: 'It asks your permission to write a draft. A draft sits in your Gmail until you press Send yourself.',
  },
  {
    q: 'What does it do while I\'m away?',
    a: 'On a schedule it can only read and report. Anything it would normally ask you about, it leaves in the report for when you\'re back.',
  },
  {
    q: 'Who pays for the web searches?',
    a: 'We do, up to a monthly limit you can see on the Connectors page. Connect your own search account and the limit goes away.',
  },
]

// A single-open accordion built to the reference (spec 11): one centred
// column of white cards with no gap between them, every item closed to
// start, clicking anywhere on the card toggles it, the chevron sits in a
// pill that tints on hover and while open, and the height animates through
// a grid row over 200ms (landing.css). The group locks its own minimum
// height on mount, so opening the last item never makes the page jump
// under the pointer.
export function Faq() {
  const [open, setOpen] = useState(-1)
  const groupRef = useRef<HTMLDivElement>(null)
  const [minHeight, setMinHeight] = useState<number>()

  useEffect(() => {
    // Measured with everything closed (the initial state), and again on
    // resize, because the number belongs to a width.
    const measure = () => {
      const el = groupRef.current
      if (!el) return
      // Clear the previous lock first, or the measurement includes it and
      // every resize adds another 80px.
      el.style.minHeight = ''
      setMinHeight(el.offsetHeight + 80)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <section id="faq" aria-label="FAQ" className="flex w-full flex-col items-center px-4 pb-[100px] pt-[160px] md:px-0 xl:pb-[160px]">
      <h2 data-depth className="ld-heading mb-8 leading-none">FAQ</h2>
      <div
        ref={groupRef}
        data-reveal
        style={{ minHeight, '--reveal-delay': '90ms' } as React.CSSProperties}
        className="isolate flex w-full max-w-[680px] flex-col md:w-1/2 md:max-w-none xl:w-[30%] xl:min-w-[540px]"
      >
        {QUESTIONS.map((item, i) => {
          const expanded = open === i
          const id = `faq-${i}`
          return (
            <div
              key={item.q}
              className="ld-faq-item group relative z-0 flex w-full cursor-pointer items-start justify-between gap-8 rounded-3xl border-2 border-transparent bg-card p-4 md:p-6"
              onClick={() => setOpen(expanded ? -1 : i)}
            >
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={id}
                  className="relative z-10 flex min-h-[30px] w-full items-center justify-between gap-4 text-left text-base outline-none xl:gap-8"
                >
                  {item.q}
                </button>
                <div id={id} className="ld-faq-panel">
                  <div>
                    <p className="pt-1 text-[15px] leading-normal text-muted-foreground xl:pt-2">{item.a}</p>
                  </div>
                </div>
              </div>
              <span aria-hidden className="ld-faq-chevron flex h-8 w-[42px] shrink-0 items-center justify-center rounded-[18px]">
                <ChevronDown className="ld-faq-chevron-icon size-4" strokeWidth={2} />
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
