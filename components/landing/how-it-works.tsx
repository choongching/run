'use client'

import { at, Spinner, Stage } from '@/components/landing/stage'

// The README's six beats, folded to three. Each card's picture is the
// product surface that beat happens on, and each plays its beat once, the
// first time it comes into view: the sentence writes itself, the card
// fills in and gets its yes, the steps tick off and stop to ask. Nothing
// here loops; the frame rests on its last state.
export function HowItWorks() {
  return (
    <section aria-label="How it works" className="flex flex-col items-center gap-10 px-4 pb-16 pt-6 md:px-8 md:pb-28 lg:gap-12">
      <div data-depth className="flex flex-col items-center gap-5 text-center">
        <h2 className="ld-heading">The setup is one sentence.</h2>
      </div>
      <div className="flex w-full max-w-[1376px] snap-x snap-mandatory gap-4 overflow-x-auto no-scrollbar md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
        <Card
          title="You say what you need."
          body="One box, one line, in your own words. That is the whole form."
        >
          <Typed words="Summarize my inbox each morning and flag anything that needs a reply" />
        </Card>
        <Card
          delay={90}
          title="Run writes the job."
          body="It asks a question or two and shows you the job on one card. Nothing starts until you say so."
        >
          <div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-[13px]">
            <span className="ld-t text-muted-foreground" style={at(0.2)}>Name</span>
            <span className="ld-t font-medium" style={at(0.6)}>Inbox Assistant</span>
            <span className="ld-t text-muted-foreground" style={at(1.2)}>And my routine is</span>
            <span className="ld-t font-medium" style={at(1.6)}>Weekday mornings, 08:00</span>
            <span aria-hidden className="mt-1 flex justify-end">
              <span
                className="ld-t-press ld-t-stay flex h-7 items-center rounded-xl bg-primary px-2.5 text-xs font-medium text-primary-foreground"
                style={{ '--d': '2.2s', '--p': '3s' } as React.CSSProperties}
              >
                Looks right
              </span>
            </span>
          </div>
        </Card>
        <Card
          delay={180}
          title="Run does it, and asks first."
          body="Reading happens on its own, step by step. Anything that changes something stops and waits for your yes."
        >
          <div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-[13px]">
            <span className="ld-t flex items-center gap-2 text-muted-foreground" style={at(0.2)}>
              <Spinner start={0.2} spins={1} />
              Read an email
            </span>
            <span className="ld-t flex items-center gap-2 text-muted-foreground" style={at(1.2)}>
              <Spinner start={1.2} spins={2} />
              Searched the web for &quot;invoice terms&quot;
            </span>
            <span className="ld-t font-medium text-primary" style={at(3.3)}>Waiting for your approval</span>
          </div>
        </Card>
      </div>
    </section>
  )
}

// A sentence that writes itself a word at a time, the caret arriving with
// the last word and staying put. Words, not letters: each one is a small
// opacity move, so nothing reflows while it types.
function Typed({ words }: { words: string }) {
  const list = words.split(' ')
  return (
    <div className="flex h-12 w-full items-center rounded-xl border border-border bg-card px-3.5 text-sm">
      <span className="flex min-w-0 gap-x-1 overflow-hidden whitespace-nowrap text-muted-foreground">
        {list.map((w, i) => (
          <span key={i} className="ld-t" style={at(0.3 + i * 0.11)}>
            {w}
          </span>
        ))}
      </span>
      <span aria-hidden className="ld-t ml-0.5 h-4 w-px shrink-0 bg-foreground" style={at(0.3 + list.length * 0.11)} />
    </div>
  )
}

function Card({
  title,
  body,
  delay = 0,
  children,
}: {
  title: string
  body: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <div data-reveal style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties} className="ld-card flex w-[300px] shrink-0 snap-start flex-col gap-4 p-5 md:w-auto md:min-h-[420px] md:gap-5 md:p-7">
      <Stage className="flex h-[220px] items-center justify-center rounded-xl bg-muted p-5 md:h-[280px] md:p-6">{children}</Stage>
      <h3 className="ld-subheading">{title}</h3>
      <p className="text-base leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}
