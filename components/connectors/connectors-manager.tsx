'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check, Globe } from 'lucide-react'

import {
  ConnectorList,
  type ConnectorState,
} from '@/components/connectors/connector-list'
import type { SearchAllowance } from '@/lib/entitlements/assert'

// A row for something that is simply there: no account to link, nothing to
// disconnect. Same card anatomy as a connector row so the page reads as one
// list, with a state chip where their button sits.
//
// Extracted when the second one arrived. One was a special case; two is a
// shape, and the third would have drifted.
function StaticConnectorRow({
  icon,
  label,
  state,
  detail,
  trailing,
}: {
  icon: React.ReactNode
  label: string
  state: string
  detail: string
  trailing: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          <span className="flex items-center gap-1 text-xs text-primary">
            <Check className="size-3 shrink-0" />
            {state}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="shrink-0 px-3 text-xs text-muted-foreground">
        {trailing}
      </span>
    </div>
  )
}

// The Connectors page body. A thin client wrapper so the page itself stays a
// server component: it only exists to refresh server data after a connect or
// disconnect lands.
export function ConnectorsManager({
  connections,
  searches,
}: {
  connections: ConnectorState
  searches: SearchAllowance
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  // Connecting Jina takes the cap off, so the count stops being the thing that
  // matters and saying "3 of 100 used" would read as a limit that no longer
  // applies.
  const searchDetail = connections.jina_ai
    ? 'Your agents search the web on your own Jina account, with no monthly limit.'
    : `Your agents can search the web. ${searches.used} of ${searches.limit} searches used this month.`

  return (
    // Width comes from the PageShell column; a second cap here would put
    // this page out of step with every other one.
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">
          Your accounts
        </h3>
        <ConnectorList
          connections={connections}
          onChanged={refresh}
          showBlurb
          only={['gmail', 'google_drive']}
        />
      </section>

      {/* Search is its own group because the two rows only make sense read
          together: the first says you already have it and what it costs you,
          the second says how to stop paying that cost. Apart, the Jina row is
          an unexplained third-party account. */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Search</h3>
        <StaticConnectorRow
          icon={<Globe className="size-5 text-muted-foreground" />}
          label="Web search"
          state={connections.jina_ai ? 'On your account' : 'Included'}
          detail={searchDetail}
          trailing={connections.jina_ai ? 'Yours' : 'Built in'}
        />
        <ConnectorList
          connections={connections}
          onChanged={refresh}
          showBlurb
          only={['jina_ai']}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Engine</h3>
        <StaticConnectorRow
          icon={<Image src="/claude-icon.png" alt="" width={26} height={26} />}
          label="Claude"
          state="Always on"
          detail="Anthropic's AI behind every agent."
          trailing="Built in"
        />
      </section>

      {/* The trust promise stays: this is the page where people hand over
          their inbox. What is coming was dropped, because the page now has
          something concrete to say instead. */}
      <p className="px-0.5 text-xs text-muted-foreground">
        Agents read on their own, but nothing is sent or changed without your
        okay.
      </p>
    </div>
  )
}
