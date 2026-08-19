// Jina's product mark: the dot and the J, traced from the official asset
// Pipedream serves for the jina_ai app. Connector logos are the one sanctioned
// exception to the monochrome-icon rule, but this mark IS monochrome, so it
// takes currentColor and reads correctly in both themes rather than carrying a
// black plate that would go invisible on a dark ground.
export function JinaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden focusable="false" className={className}>
      <circle cx="72" cy="176" r="42" fill="currentColor" />
      <path
        d="M147 30h74a12 12 0 0 1 12 12v104a76 76 0 0 1-76 76h-22V42a12 12 0 0 1 12-12Z"
        fill="currentColor"
      />
    </svg>
  )
}
