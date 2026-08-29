import Image from 'next/image'

import { LandingComposer } from '@/components/landing/landing-composer'

// The wall again, the mark, and the same box as the top of the page.
export function CtaBanner() {
  return (
    <section aria-label="Get started" className="ld-cta-container px-4 py-4 md:px-6 md:py-6 xl:px-8 xl:py-5">
      <div className="ld-surface relative mx-auto h-[520px] max-w-[1376px] overflow-hidden bg-foreground md:h-[724px]">
        <Image src="/home-backdrop-2200.webp" alt="" fill sizes="(min-width: 1440px) 1376px, 100vw" className="object-cover opacity-90" />
        <div aria-hidden className="absolute inset-0 bg-[rgba(20,24,20,0.35)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-5 text-center text-white md:gap-7 md:px-[120px]">
          <Image src="/run-icon.png" alt="" width={56} height={56} className="size-11 rounded-lg md:size-14" />
          <h2 className="ld-heading max-w-[760px] text-white">There is nothing to set up.</h2>
          <p className="ld-lead max-w-[520px] text-white/85">
            Say what you need and it exists. It asks a couple of questions to be sure, then starts
            working.
          </p>
          <LandingComposer typing={false} placeholder="What should your first agent do?" className="mt-4" />
        </div>
      </div>
    </section>
  )
}
