import { History } from 'lucide-react'

// The sidebar meter's hover card. The history icon beside the title is the
// click affordance: quieter and shorter than a sentence saying the same.
export function RunsCard({
  used,
  limit,
  resetsAt,
}: {
  used: number
  limit: number
  resetsAt: string
}) {
  const share = limit > 0 ? used / limit : 0
  const pct = Math.min(100, Math.round(share * 100))
  const fill =
    share >= 0.95
      ? 'bg-destructive'
      : share >= 0.8
        ? 'bg-chart-4'
        : 'bg-foreground/70'
  const refillMonth = new Date(resetsAt).toLocaleDateString('en-US', {
    month: 'long',
  })

  return (
    <div className="flex flex-col gap-2.5 text-left">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Total runs this month</p>
        <History className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{pct}%</span>
        <span className="tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()} runs
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Fresh {limit.toLocaleString()} on {refillMonth} 1.
      </p>
    </div>
  )
}
