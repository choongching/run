import Image from 'next/image'

import { Showcase } from '@/components/auth/showcase'

// The two-column door. Form on the left, an agent at work on the right.
//
// A server component with no data behind it: the auth pages make no Supabase
// call on render (the proxy's local getClaims is the only server work, and
// the password grant happens on submit), and this keeps it that way. The one
// client island is the scene timer inside Showcase.
//
// `showcase` is `play` on sign-in, where a returning person can watch the
// three scenes while typing, and `still` everywhere else: register, forgot
// and reset are for doing one thing, so the panel rests on the first scene.
//
// Below md the panel folds to a short banner above the form (styleguide 5b:
// the form lives on the page, the card is gone), and the desktop shape starts
// at md so a tablet gets the two columns.
export function AuthShell({
  showcase,
  children,
}: {
  showcase: 'play' | 'still'
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background md:flex-row">
      <div className="flex flex-1 flex-col justify-between gap-8 px-4 pt-4 pb-6 md:w-1/2 md:px-12 md:py-10">
        <div className="flex items-center gap-2.5">
          <Image src="/run-icon.png" alt="" width={28} height={28} priority />
          <span className="text-base font-semibold">Run</span>
        </div>
        <div className="mx-auto w-full max-w-sm">{children}</div>
        {/* The maker's mark: quiet, present on every door. */}
        <p className="text-xs text-muted-foreground/70 max-md:text-center">
          Designed and built by CC Teo
        </p>
      </div>
      {/* Above the form on a phone, beside it from md up. */}
      <div className="order-first h-44 shrink-0 px-4 pt-4 md:order-last md:h-auto md:w-1/2 md:px-3 md:py-3 md:pl-0">
        <Showcase mode={showcase} />
      </div>
    </div>
  )
}
