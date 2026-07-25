// Official Gmail product mark, inlined so no external asset is needed.
// Connector logos are the one sanctioned exception to the monochrome-icon rule.
export function GmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 40" aria-hidden focusable="false" className={className}>
      <path
        d="M3.64 40h8.18V20.09L0 10.91v25.45C0 37.37 1.63 40 3.64 40Z"
        fill="#4285f4"
      />
      <path
        d="M40.18 40h8.18c2.01 0 3.64-1.64 3.64-3.64V10.91l-11.82 9.18Z"
        fill="#34a853"
      />
      <path
        d="M40.18 3.64v16.45L52 10.91V5.45c0-5.05-5.77-7.94-9.82-4.91Z"
        fill="#fbbc04"
      />
      <path d="M11.82 20.09V3.64L26 14.27l14.18-10.63v16.45L26 30.73Z" fill="#ea4335" />
      <path
        d="M0 5.45v5.46l11.82 9.18V3.64L9.82.55C5.77-2.49 0 .4 0 5.45Z"
        fill="#c5221f"
      />
    </svg>
  )
}
