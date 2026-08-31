import { Check, Send } from 'lucide-react'

import { GmailIcon } from '@/components/icons/gmail'
import { GoogleDriveIcon } from '@/components/icons/google-drive'
import { TelegramIcon } from '@/components/icons/telegram'
import { cn } from '@/lib/utils'

// The three stories the sign-in door already plays, drawn still. Each is a
// chat surface at the moment that matters: the draft waiting for a yes, the
// answer with its sources, the Monday brief that went to a phone. They are
// demonstrations, not records: the names and numbers in them are made up,
// the shapes are exactly what the product draws.

function Step({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Check className="size-3.5" strokeWidth={2} />
      {children}
    </span>
  )
}

function Ask({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[78%] self-end rounded-xl bg-muted px-3.5 py-2.5 text-sm leading-[1.45]">
      {children}
    </div>
  )
}

// A source or file chip. Shared by every product fragment on the page.
export function Chip({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span className={`flex h-6 items-center gap-1.5 rounded-lg border border-border bg-card px-2 text-xs ${className}`} style={style}>
      {children}
    </span>
  )
}

function Head({
  name,
  tint,
  icon,
  where,
}: {
  name: string
  tint: string
  icon: React.ReactNode
  where: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3.5">
      <div className="flex items-center gap-2.5">
        <span className={cn('size-7 rounded-full', tint)} />
        <span className="text-[15px] font-medium">{name}</span>
      </div>
      <Chip>
        {icon}
        {where}
      </Chip>
    </div>
  )
}

export function ApprovalCard({
  title,
  icon,
  rows,
  body,
  className,
}: {
  title: string
  icon: React.ReactNode
  rows: [string, string][]
  body?: string
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-ring/60 bg-card', className)}>
      <div className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border px-3 py-2.5 text-xs">
        {rows.map(([k, v]) => (
          <span key={k} className="contents">
            <span className="text-muted-foreground">{k}</span>
            <span>{v}</span>
          </span>
        ))}
      </div>
      {body && (
        <p className="border-t border-border px-3 py-2.5 text-xs/[18px] text-muted-foreground">{body}</p>
      )}
    </div>
  )
}

export function ApproveRow({ decline = 'Cancel', approve = 'Approve' }: { decline?: string; approve?: string }) {
  return (
    <div aria-hidden className="flex justify-end gap-2">
      <span className="flex h-8 items-center rounded-xl border border-border bg-card px-3 text-[13px] font-medium">
        {decline}
      </span>
      <span className="flex h-8 items-center rounded-xl bg-primary px-3 text-[13px] font-medium text-primary-foreground">
        {approve}
      </span>
    </div>
  )
}

const shell = 'ld-surface flex flex-col gap-4 border border-border bg-card p-5 md:p-7'

export function GmailStory({ className }: { className?: string }) {
  return (
    <div className={cn(shell, className)}>
      <Head name="Inbox Assistant" tint="bg-chart-3/40" icon={<GmailIcon className="h-3 w-4" />} where="Gmail" />
      <Ask>Draft a reply to Acme. Invoice 1042 goes out Friday.</Ask>
      <Step>Read the thread</Step>
      <p className="text-sm leading-normal">Priya has asked twice, so I kept it short and led with the date.</p>
      <ApprovalCard
        title="Create a draft in Gmail"
        icon={<GmailIcon className="h-3 w-4" />}
        rows={[
          ['To', 'Priya Nair <priya@acme.com>'],
          ['Subject', 'Re: Invoice 1042, second reminder'],
        ]}
        body="Hi Priya, thanks for your patience. Payment for invoice 1042 goes out on Friday…"
      />
      <ApproveRow />
    </div>
  )
}

export function DriveStory({ className }: { className?: string }) {
  return (
    <div className={cn(shell, className)}>
      <Head name="Docs Q&A Agent" tint="bg-chart-1/30" icon={<GoogleDriveIcon className="size-3.5" />} where="Google Drive" />
      <Ask>What did the Q2 board deck say about churn?</Ask>
      <Step>Read two documents</Step>
      <p className="text-sm leading-normal">
        Churn fell to 2.1% after the onboarding change, page 4. The board asked for the same read in Q3
        before deciding on the second hire.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Chip>Q2 board deck.pdf</Chip>
        <Chip>Retention, weekly</Chip>
      </div>
      <div className="mt-auto flex h-11 items-center rounded-xl border border-border px-3.5 text-sm text-muted-foreground">
        Ask a follow-up question
      </div>
    </div>
  )
}

export function RoutineStory({ className }: { className?: string }) {
  return (
    <div className={cn(shell, className)}>
      <Head name="Industry News Tracker" tint="bg-chart-5/30" icon={<TelegramIcon className="size-3.5" />} where="Telegram" />
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        Routine ran, Monday 08:00
      </div>
      <Step>Read 14 pages</Step>
      <p className="text-sm leading-normal">
        Two things worth your Monday. Northwind moved its Team plan to $18 a seat, up from $12, and
        Acme&apos;s CTO said in an interview that she leaves in Q4. The rest of the week was quiet.
      </p>
      <div className="mt-auto flex items-center gap-2 text-[13px] text-muted-foreground">
        <Send className="size-3.5" strokeWidth={2} />
        Sent to your phone
      </div>
    </div>
  )
}
