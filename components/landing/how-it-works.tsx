import { Check } from 'lucide-react'

// The README's six beats, folded to three. Each card's picture is the
// product surface that beat happens on.
export function HowItWorks() {
  return (
    <section aria-label="How it works" className="flex flex-col items-center gap-10 px-4 pb-16 pt-6 md:px-8 md:pb-28 lg:gap-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="ld-heading">Describing what you want is the setup.</h2>
      </div>
      <div className="flex w-full max-w-[1376px] snap-x snap-mandatory gap-4 overflow-x-auto no-scrollbar md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
        <Card
          title="You state the intent."
          body="One box, one sentence. The box types real examples while it waits."
        >
          <div className="flex h-12 w-full items-center rounded-lg border border-border bg-card px-3.5 text-sm text-muted-foreground">
            <span className="truncate">Summarize my inbox each morning and flag anything that needs a reply</span>
            <span aria-hidden className="ml-0.5 h-4 w-px shrink-0 bg-foreground" />
          </div>
        </Card>
        <Card
          title="It writes its own job description."
          body="A few quick questions on one card, ending with what starts it off: you, or the clock. Nothing runs before your yes."
        >
          <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3.5 text-[13px]">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">Inbox Assistant</span>
            <span className="text-muted-foreground">And my routine is</span>
            <span className="font-medium">Weekday mornings, 08:00</span>
          </div>
        </Card>
        <Card
          title="It does the work, and asks when it matters."
          body="Reading needs no permission and it narrates each step. Anything that changes something stops and shows you the whole thing."
        >
          <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3.5 text-[13px]">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="size-3.5" strokeWidth={2} />
              Read an email
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="size-3.5" strokeWidth={2} />
              Searched the web for &quot;invoice terms&quot;
            </span>
            <span className="font-medium text-primary">Waiting for your approval</span>
          </div>
        </Card>
      </div>
    </section>
  )
}

function Card({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <div className="ld-card flex w-[300px] shrink-0 snap-start flex-col gap-4 p-5 md:w-auto md:min-h-[420px] md:gap-5 md:p-7">
      <div className="flex h-[150px] items-center justify-center rounded-lg bg-muted p-5 md:h-[180px] md:p-6">{children}</div>
      <h3 className="text-xl font-semibold leading-tight tracking-tight md:text-2xl">{title}</h3>
      <p className="text-base leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}
