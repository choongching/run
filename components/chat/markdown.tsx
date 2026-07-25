import ReactMarkdown from 'react-markdown'

// Agent replies render as markdown, constrained to our tokens. Kept small and
// stateless so streaming re-renders stay cheap.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground prose-headings:font-semibold prose-a:text-primary prose-a:underline-offset-2">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
