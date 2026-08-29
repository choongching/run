import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const PRODUCT = [
  { href: '#how', label: 'How it works' },
  { href: '#safety', label: 'Safety' },
  { href: '#faq', label: 'FAQ' },
  { href: '/login', label: 'Log in' },
]

// Sits on the page, above the curtain. Its bottom corners are the page's
// last edge before the page lifts away.
export function Footer() {
  return (
    <footer className="px-4 md:px-8">
      <div className="ld-card mx-auto flex max-w-[1376px] flex-col justify-between gap-10 rounded-b-[24px] xl:rounded-b-[64px] p-7 md:min-h-[517px] md:p-14 lg:px-16">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:gap-12">
          <div className="flex max-w-[360px] flex-col gap-4">
            <div className="flex items-center gap-2.5 text-lg font-semibold">
              <Image src="/run-icon.png" alt="" width={26} height={26} className="rounded-md" />
              Run
            </div>
            <p className="text-base leading-relaxed text-muted-foreground">
              You provide the intent, it provides the labor, and everything with consequences passes
              through your hands.
            </p>
            <Link
              href="/register"
              className="ld-btn flex h-11 w-fit items-center gap-2 overflow-hidden rounded-lg bg-primary px-4.5 text-[15px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              <span>Get started</span>
              <ArrowRight className="ld-btn-chevron size-4" strokeWidth={2} />
            </Link>
          </div>
          <div className="flex gap-16 md:gap-24">
            <div className="flex flex-col gap-3 text-[15px]">
              <span className="font-semibold">Product</span>
              {PRODUCT.map((l) => (
                <a key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground hover:underline">
                  {l.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3 text-[15px]">
              <span className="font-semibold">Company</span>
              <a href="mailto:teo.choong.ching@gmail.com" className="text-muted-foreground hover:text-foreground hover:underline">
                Contact
              </a>
              <a href="https://github.com/choongching/run" className="text-muted-foreground hover:text-foreground hover:underline">
                Source
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-2 text-[13px] text-muted-foreground md:flex-row">
          <span>© 2026 Run · tryrun.today</span>
          <span>Your Gmail and Drive are connected by you, and read only by your own agents.</span>
        </div>
      </div>
    </footer>
  )
}

// The fixed layer under the page: the green and the wordmark. Plain text,
// sized in viewport widths, so its height is a known fraction of the reveal
// at every width. (An SVG was tried first; a CSS font variable does not
// resolve inside an SVG presentation attribute, so it drew in the fallback
// face and overflowed its box.)
export function Curtain() {
  return (
    <div aria-hidden className="ld-curtain flex items-end justify-center overflow-hidden">
      <span className="ld-wordmark">Run</span>
    </div>
  )
}
