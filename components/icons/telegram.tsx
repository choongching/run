// Telegram's mark, the official plane on the brand's own blue gradient.
//
// Same sanctioned exception as the other connector logos: this sits in a list
// beside the full-colour Gmail, Drive and Brave marks, so a flat monochrome
// plane would read as the odd one out rather than the restrained one.
//
// The gradient id is namespaced for the same reason Brave's is: two SVGs
// sharing a bare id on one page is a real bug, and the Connectors page renders
// both of them.
export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className={className}>
      <defs>
        <linearGradient id="run-telegram-disc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#37BBFE" />
          <stop offset="100%" stopColor="#007DBB" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#run-telegram-disc)" />
      <path
        fill="#fff"
        d="M5.43 11.87c3.5-1.53 5.83-2.53 7-3.01 3.33-1.39 4.02-1.63 4.47-1.64.1 0 .32.02.46.14.12.1.15.23.17.33.02.1.04.31.02.48-.18 1.9-.97 6.5-1.37 8.63-.17.9-.5 1.2-.83 1.24-.7.06-1.24-.47-1.92-.92-1.07-.7-1.67-1.14-2.71-1.82-1.2-.79-.42-1.22.26-1.93.18-.19 3.27-3 3.33-3.25.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.8 1.15-5.1 3.37-.48.33-.92.5-1.31.48-.43-.01-1.26-.24-1.88-.44-.76-.25-1.36-.38-1.3-.8.02-.22.32-.44.9-.67z"
      />
    </svg>
  )
}
