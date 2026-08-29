// The reference's sign-up bar (spec 5.4): an email field and a white
// "Get started", glass over the photograph, 275px at rest and 360 while
// you are in it. Submitting carries the address to the sign-up page, where
// it is already filled in, so "Get started" is the first step of making an
// account rather than a link to a form.
export function SignUpBar({ className = '' }: { className?: string }) {
  return (
    <form action="/register" method="get" className={`flex w-full justify-center ${className}`}>
      <div className="flex h-[54px] w-full max-w-[275px] items-center rounded-[12px] border border-white/10 bg-white/10 p-1.5 backdrop-blur-lg transition-[max-width] duration-300 ease-out md:focus-within:max-w-[360px]">
        <input
          name="email"
          type="email"
          required
          placeholder="Your email"
          autoComplete="email"
          aria-label="Your email"
          className="min-w-0 flex-1 bg-transparent px-2 text-base text-white outline-none placeholder:text-white/80 md:px-4"
        />
        <button
          type="submit"
          className="flex h-[42px] shrink-0 items-center rounded-[12px] bg-card px-4 text-[15px] font-medium text-foreground transition-colors hover:bg-white/90"
        >
          Get started
        </button>
      </div>
    </form>
  )
}
