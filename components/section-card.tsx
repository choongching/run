import { cn } from '@/lib/utils'

// The one container shape every standard page is built from.
//
// Before this, four surfaces solved the same problem four ways. Knowledge and
// the run history put their rows inside one bordered box divided by hairlines.
// Connectors and Routines made every row its own floating card. Settings used
// the shadcn Card, which draws a RING rather than a border, so its cards were
// the only outlines in the app that were not our border token. Row padding had
// four values, section headings had five treatments, and one group on
// Connectors had no heading at all.
//
// The shape, decided on a canvas with the founder:
//
//   A page is a stack of CARDS. A card carries one heading and nothing else
//   in words. The heading names the pile; the rows say the rest.
//
//   A card that holds a LIST puts that list in its own bordered box, one
//   radius step smaller than the card, with the rows divided by hairlines and
//   nothing else. The box holds the things, the card holds the words about
//   them.
//
//   An empty state fills the box's slot rather than replacing the card, so a
//   page keeps its shape when there is nothing in it yet.
//
// A section that is a FORM keeps its fields on the card, with no inner box: a
// hairline between two inputs reads as a table of inputs. Settings is the only
// page where that applies today.

// There is deliberately no description or footnote prop. Every card had a
// line under its heading and some had a second line under the box, and read
// down a page they were a wall of explanation nobody needed twice. Founder
// call 2026-08-23: the heading only. Anything that has to be said belongs to
// the row it is about, or to the page subtitle, or it is not worth saying.
export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: React.ReactNode
  // Sits on the heading's line, at the trailing edge: the one thing this
  // section does that is not about a single row.
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3.5 rounded-xl border border-border bg-card p-4 md:p-5',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {/* One step below the page title: one loudest voice per page. */}
          {title && (
            <h2 className="flex items-center gap-2 text-base font-medium">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

// A count beside a section's title. Quiet, because the title is the label and
// the number is only how many.
export function SectionCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-normal text-muted-foreground">{children}</span>
  )
}

// The nested block. Hairlines only: a vertical rule would make it a table, and
// a gap would make every row a card again.
export function RowBox({
  children,
  className,
  // A box whose rows are <li>. Semantics only: a list of things a person can
  // act on is a list, and an <li> outside a <ul> is invalid.
  list = false,
}: {
  children: React.ReactNode
  className?: string
  list?: boolean
}) {
  const box = cn(
    'divide-y divide-border overflow-hidden rounded-lg border border-border',
    className
  )
  return list ? (
    <ul className={box}>{children}</ul>
  ) : (
    <div className={box}>{children}</div>
  )
}

// One row. The lead is usually an icon tile, the body is a name over a detail
// line, and everything the row lets you DO gathers at the trailing edge.
export function Row({
  lead,
  title,
  detail,
  trailing,
  className,
  // A row inside a `RowBox list`. Same shape, rendered as the <li> that box's
  // <ul> requires. Knowledge and Routines hand-rolled their rows only because
  // this component was a <div>, and both drifted from the recipe within a
  // week of it being written.
  item = false,
  ...rest
}: {
  lead?: React.ReactNode
  title: React.ReactNode
  detail?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
  item?: boolean
} & Omit<React.ComponentProps<'div'>, 'title'>) {
  // One element type either way; the props are the same in both, and the
  // union of the two ref types is what TS cannot narrow on its own.
  const Tag = (item ? 'li' : 'div') as 'div'
  return (
    <Tag
      className={cn('flex items-center gap-3 px-3.5 py-3', className)}
      {...rest}
    >
      {lead}
      <div className="min-w-0 flex-1">
        {/* min-w-0 so a long name inside can truncate: a flex item defaults
            to min-width:auto and would push the row wider instead. */}
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          {title}
        </div>
        {/* Wraps rather than truncates. A row's detail is a sentence about the
            thing, and half a sentence is worse than a taller row. A row whose
            detail is DATA rather than prose (a routine's schedule, a source's
            size) passes its own truncating node. */}
        {detail && (
          <p className="mt-0.5 text-xs leading-[1.5] text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
      {trailing && (
        <div className="flex flex-none items-center gap-2.5 text-sm text-muted-foreground">
          {trailing}
        </div>
      )}
    </Tag>
  )
}

// The square that leads a row. One radius step down from the box it sits in,
// which is one step down from the card.
export function RowTile({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  )
}

// Nothing here yet, in the slot the rows would fill. Same dashed language as
// the page-level empty states, sized for the inside of a card.
export function EmptyBox({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-border px-5 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
