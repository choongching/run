'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import {
  ConnectorList,
  type ConnectorState,
} from '@/components/connectors/connector-list'

// The engine row. Not a connector: there is nothing to link and nothing to
// disconnect, so it renders the same card anatomy as the rows above but with
// an Always on state where their button sits. It exists so the page tells the
// whole truth about what an agent runs on, not just which accounts it reads.
function ClaudeRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
        <Image src="/claude-icon.png" alt="" width={26} height={26} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Claude</p>
          <span className="flex items-center gap-1 text-xs text-primary">
            <Check className="size-3 shrink-0" />
            Always on
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Anthropic&apos;s AI behind every agent. Web search included.
        </p>
      </div>
      <span className="px-3 text-xs text-muted-foreground">Built in</span>
    </div>
  )
}

// The Connectors page body. A thin client wrapper so the page itself stays a
// server component: it only exists to refresh server data after a connect or
// disconnect lands.
export function ConnectorsManager({
  connections,
}: {
  connections: ConnectorState
}) {
  const router = useRouter()

  return (
    // Width comes from the PageShell column; a second cap here would put
    // this page out of step with every other one.
    <div className="flex flex-col gap-3">
      <ConnectorList
        connections={connections}
        onChanged={() => router.refresh()}
        showBlurb
      />
      <ClaudeRow />
      {/* Two beats: the trust promise, then what is coming. The promise stays
          because this is the page where people hand over their inbox. Web
          search lives on the Claude row above, because that is where it
          actually comes from. */}
      <p className="px-0.5 text-xs text-muted-foreground">
        Agents read on their own, but nothing is sent or changed without your
        okay. More connectors are on the way.
      </p>
    </div>
  )
}
