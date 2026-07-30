import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'

// Agent replies render as markdown, constrained to our tokens. Kept small so
// streaming re-renders stay cheap; the cite-strip is memoized because this
// runs on every frame of a live turn.
//
// Web-search citations arrive as <cite index="..."> tags in the model's text.
// New replies are cleaned at persistence (run-turn), but the live stream and
// replies stored before the fix still carry the tags, so strip here too.
export function Markdown({ children }: { children: string }) {
  const text = useMemo(
    () => children.replace(/<\/?cite\b[^>]*>/g, ''),
    [children],
  )
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground prose-headings:font-semibold prose-a:text-primary prose-a:underline-offset-2">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  )
}
