import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { isCitationLink, SourceChip } from '@/components/chat/source-chip'

// Agent replies render as markdown, constrained to our tokens. Kept small so
// streaming re-renders stay cheap; the cite-strip is memoized because this
// runs on every frame of a live turn.
//
// Web-search citations arrive as <cite index="..."> tags in the model's text.
// New replies are cleaned at persistence (run-turn), but the live stream and
// replies stored before the fix still carry the tags, so strip here too.
//
// GFM is not optional here. Plain react-markdown is CommonMark, which has no
// tables, so an agent asked for a comparison would write a perfectly good
// table and we would render it as one paragraph of pipes: markdown collapses
// the newlines, and the result is unreadable. GFM also restores strikethrough,
// task lists and bare-URL links, all of which models write by habit.
// Agents habitually write a citation as "(CNBC)", with the brackets as plain
// text on either side of the link. Rendering the link as a chip would leave
// "( chip )", so the brackets come off here, in the source, before parsing.
//
// Narrow on purpose: it only matches a bracket pair wrapping a WHOLE markdown
// link and nothing else, so "(see the filing [here](url) for detail)" is left
// alone. Done as a string pass rather than a remark plugin because it is two
// lines against a syntax-tree visitor, and this runs on every frame of a live
// stream.
const BRACKETED_LINK = /\((\[[^\]\n]{1,64}\]\([^)\s]+\))\)/g

export function Markdown({ children }: { children: string }) {
  const text = useMemo(
    () => children.replace(/<\/?cite\b[^>]*>/g, '').replace(BRACKETED_LINK, '$1'),
    [children],
  )
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground prose-headings:font-semibold prose-a:text-primary prose-a:underline-offset-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // A citation renders as a chip; a prose link stays a link. The test
          // lives beside the chip so both halves of the decision are in one
          // file. Falls back to an ordinary link whenever the children are not
          // plain text, because anything with formatting inside it is a
          // sentence rather than a source name.
          a: ({ href, children: label }) => {
            const text = typeof label === 'string' ? label : null
            if (href && text && isCitationLink(text, href)) {
              return <SourceChip href={href} />
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            )
          },
          // A comparison table is usually wider than the conversation column
          // (38.4rem), so it scrolls inside its own box rather than pushing
          // the whole thread sideways. Same rule as code blocks.
          table: ({ children: cells }) => (
            <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">{cells}</table>
            </div>
          ),
          // Header cells carry the weight; body cells stay quiet. Cells wrap
          // rather than truncate, because a spec value cut in half is worse
          // than a tall row.
          th: ({ children: cell }) => (
            <th className="border-b border-border bg-muted/60 px-3 py-2 text-left align-top font-semibold">
              {cell}
            </th>
          ),
          td: ({ children: cell }) => (
            <td className="border-b border-border px-3 py-2 align-top last:border-r-0">
              {cell}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
