import Image from 'next/image'

import { HeroMedia, HeroPoster } from '@/components/landing/hero-media'
import { SignUpBar } from '@/components/landing/sign-up-bar'

// The reference's closing banner (spec 12.1): a big rounded frame of
// footage, the mark in white, a two-line serif heading, and the same
// sign-up bar as the top of the page. The footage is the founder's clip,
// on a loop, played only while the banner is on screen.
const CTA_CLIPS = ['/landing/cta.mp4']

export function CtaBanner() {
  return (
    <section aria-label="Get started" className="ld-cta-container px-4 py-4 md:px-6 md:py-6 xl:px-8 xl:py-5">
      <div className="ld-surface relative mx-auto aspect-[362/463] max-h-[465px] w-full max-w-[2056px] overflow-hidden bg-foreground md:aspect-auto md:h-[700px] md:max-h-[700px] xl:aspect-[1664/876] xl:h-auto xl:max-h-[876px]">
        <HeroPoster src="/landing/cta-poster.webp" priority={false} />
        <HeroMedia sources={CTA_CLIPS} />
        <div aria-hidden className="absolute inset-0 bg-[rgba(20,24,20,0.3)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-white">
          <Image src="/run-icon.png" alt="" width={120} height={120} className="mb-6 size-16 invert md:mb-8 md:size-[100px] xl:size-[120px]" />
          <h2 className="ld-heading mb-4 text-white md:mb-6">
            A little more room
            <br />
            in your day.
          </h2>
          <SignUpBar className="mt-4" />
        </div>
      </div>
    </section>
  )
}
