import Image from 'next/image'

// The line after the hero. It opens the way every chapter below it does,
// coming up out of the distance as you scroll (data-depth, see reveal.tsx).
export function Intro() {
  return (
    <section
      aria-label="An agent, not a chatbot"
      className="flex flex-col items-center px-5 pb-16 pt-20 text-center md:pb-28 md:pt-36"
    >
      <div data-depth className="flex flex-col items-center gap-6 md:gap-7">
        <Image src="/run-icon.png" alt="" width={64} height={64} className="size-12 rounded-lg md:size-16" />
        <h2 className="ld-heading max-w-[900px]">An agent, not a chatbot.</h2>
        <p className="ld-lead max-w-[620px] text-muted-foreground">
          A chatbot waits for your next prompt. An agent works toward a goal. Think of a chatbot as a
          calculator and an agent as a colleague: you provide the intent, it provides the labor.
        </p>
      </div>
    </section>
  )
}
