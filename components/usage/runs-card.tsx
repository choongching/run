// The run-allowance breakdown card, shared by the composer donut and the
// sidebar meter so both hovers tell the same story the same way. Purely
// presentational; whoever renders it owns positioning and data.
export function RunsCard({
  used,
  limit,
  resetsAt,
  hint,
}: {
  used: number
  limit: number
  resetsAt: string
  // One muted line at the bottom, for a click affordance ("Click for run
  // history"). Omitted where clicking does nothing more.
  hint?: string
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
      <p className="text-sm font-medium">Runs this month</p>
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
      {hint && (
        <p className="border-t border-border pt-2.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}
