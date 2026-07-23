import type { AgentStatus } from '@/lib/types/database'

const STATUS_DOT: Record<AgentStatus, string> = {
  active: 'bg-chart-1',
  paused: 'bg-chart-4',
  draft: 'bg-muted-foreground/40',
  archived: 'bg-muted-foreground/40',
}

// Meta-chip recipe from the styleguide, shared by cards and detail headers.
export function AgentStatusChip({ status }: { status: AgentStatus }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
      <span aria-hidden className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      <span className="capitalize">{status}</span>
    </span>
  )
}
