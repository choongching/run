'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// From the README's security FAQ: real questions, answered by reading the
// code rather than from memory.
const QUESTIONS = [
  {
    q: 'If a prompt injection tells the agent to send an email, what stops it?',
    a: 'Nothing stops it, because there is nothing to stop. Sending is not in the agent’s toolbox. The whole toolbox is: search inbox, read an email, create a draft, list and read and organize Drive files, write a document, ask you a question. An injected instruction cannot invoke a capability that does not exist, the same way your calculator cannot make phone calls.',
  },
  {
    q: 'What enforces the line between deciding and doing?',
    a: 'The decision and the execution happen on different computers. The model runs on Anthropic’s servers, and when it decides to use a tool, all that physically happens is it emits a message and the session pauses. Execution only ever happens in Run’s backend, which auto-runs a short allowlist of read-only tools; every write, and anything unrecognized, stops there and becomes a card you see.',
  },
  {
    q: 'Could an injection forge or alter the approval?',
    a: 'The pending call is written to the database on the server, attached to your own conversation. When you tap Approve, the server executes only what is stored in that row, and clears it so a double-tap cannot run it twice. Nothing the model says afterward can substitute a different action than the one you were shown.',
  },
  {
    q: 'So the worst case is?',
    a: 'An injection can, at most, make an agent ask your permission to write a draft. A draft is inert: it sits in your Gmail drafts folder, and the only finger that can press Send is yours.',
  },
  {
    q: 'What happens when nobody is watching?',
    a: 'A routine is the same agent doing the same work on a schedule. Each run starts with a blank memory and reads only its last report. And it cannot write: anything it would normally ask about, it describes in its reply and leaves for you, so an unattended run never becomes an unattended action.',
  },
  {
    q: 'Who pays for the web searches?',
    a: 'We do, by default, up to a monthly limit shown on the Connectors page next to the name of the search engine actually answering. Connect your own Jina account and the limit stops applying: your key stays with Pipedream and never reaches us, exactly like Gmail and Drive.',
  },
]

// A single-open accordion. Clicking anywhere on a card toggles it; the
// height animates through a grid row (landing.css) so no number has to be
// measured. The group locks its own minimum height on mount, so opening
// the last item never makes the page jump under the pointer.
export function Faq() {
  const [open, setOpen] = useState(0)
  const groupRef = useRef<HTMLDivElement>(null)
  const [minHeight, setMinHeight] = useState<number>()

  useEffect(() => {
    // Measured with the first item open (the initial state), and again on
    // resize, because the number belongs to a width: the phone's taller
    // list locked onto the desktop layout would leave a blank band.
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
    <section id="faq" aria-label="Questions people ask" className="flex flex-col gap-8 px-4 py-16 md:px-8 md:py-28 lg:flex-row lg:justify-center lg:gap-[120px]">
      <div className="flex flex-col gap-4 lg:w-[420px]">
        <span className="ld-eyebrow">Questions people ask</span>
        <h2 className="ld-heading">Answered by reading the code, not from memory.</h2>
      </div>
      <div ref={groupRef} style={{ minHeight }} className="flex flex-col gap-3 lg:w-[640px]">
        {QUESTIONS.map((item, i) => {
          const expanded = open === i
          const id = `faq-${i}`
          return (
            <div
              key={item.q}
              className="ld-faq-item ld-card cursor-pointer p-5 md:px-7 md:py-6"
              onClick={() => setOpen(expanded ? -1 : i)}
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={id}
                className="flex w-full items-center justify-between gap-4 text-left outline-none md:gap-6"
              >
                <span className="text-base font-medium md:text-xl md:tracking-tight">{item.q}</span>
                <span className="ld-faq-chevron flex size-9 shrink-0 items-center justify-center rounded-full border border-border">
                  <ChevronDown className="size-4" strokeWidth={2} />
                </span>
              </button>
              <div id={id} className="ld-faq-panel">
                <div>
                  <p className="pt-3.5 text-base leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
