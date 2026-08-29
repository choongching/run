import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// The reference's footer (spec 12.2): a full-width white card, 517px tall,
// its bottom corners the page's last edge before the curtain. Left, the
// page's line again as a two-line serif heading with the italic turn and
// the one dark button on the page; right, three short link lists and, at
// the bottom, the mark over a mono copyright.
const LISTS = [
  { title: 'Product', links: [['How it works', '#how'], ['Safety', '#safety'], ['FAQ', '#faq']] },
  { title: 'Company', links: [['Contact', 'mailto:teo.choong.ching@gmail.com'], ['Source', 'https://github.com/choongching/run']] },
  { title: 'Account', links: [['Log in', '/login'], ['Create an account', '/register']] },
] as const

export function Footer() {
  return (
    <footer className="ld-footer relative z-1 w-full bg-card">
      <div className="mx-auto flex min-h-[56svh] max-w-[2120px] flex-col px-4 pb-6 pt-8 md:h-[517px] md:flex-row md:justify-between md:px-8 xl:pt-20">
        <div data-reveal className="mb-8">
          <p className="ld-heading mb-4 md:mb-6 xl:mb-8">
            Say what you need.
            <br />
            <em>Run does the rest.</em>
          </p>
          <Link
            href="/register"
            className="ld-btn flex h-[42px] w-fit items-center gap-2 rounded-[12px] bg-[#120C08] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#473D37]"
          >
            <span>Get started</span>
            <ArrowRight className="ld-btn-chevron size-4" strokeWidth={2} />
          </Link>
        </div>
        <div data-reveal style={{ '--reveal-delay': '90ms' } as React.CSSProperties} className="flex h-full flex-1 flex-col justify-between gap-16 md:flex-none md:gap-x-[100px] md:pr-[74px]">
          <div className="flex w-full flex-wrap justify-between gap-y-1.5 md:gap-[74px] xl:gap-[150px]">
            {LISTS.map((list) => (
              <dl key={list.title} className="min-w-[49%] md:min-w-0">
                <dt className="mb-2.5 text-[15px] text-muted-foreground">{list.title}</dt>
                {list.links.map(([label, href]) => (
                  <dd key={label} className="mb-[7px] text-[15px]">
                    <a href={href} className="hover:underline">
                      {label}
                    </a>
                  </dd>
                ))}
              </dl>
            ))}
          </div>
          <div className="mt-auto flex flex-col items-start gap-2 md:mt-0">
            <Image src="/run-icon.png" alt="" width={40} height={40} className="rounded-lg" />
            <p className="font-mono text-sm leading-tight">
              © 2026 Run. All rights reserved.
              <br />
              Made in Singapore.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// The fixed layer under the page: the gradient and the wordmark. The page
// (main + footer) sits above it and ends 29vw short of the bottom, so the
// last stretch of scroll lifts the page away and reveals this. No JS.
export function Curtain() {
  return (
    <div aria-hidden className="ld-curtain">
      <span className="ld-wordmark">Run</span>
    </div>
  )
}
