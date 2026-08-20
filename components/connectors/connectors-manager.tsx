'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import {
  ConnectorList,
  type ConnectorState,
} from '@/components/connectors/connector-list'
import { TelegramRow } from '@/components/connectors/telegram-row'
import { BraveIcon } from '@/components/icons/brave'
import { JinaIcon } from '@/components/icons/jina'
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
  // A node rather than a string, because one of these rows has a quantity to
  // report and the others have a word. Both sit in the same slot, so the row
  // heights stay level down the list.
  trailing: React.ReactNode
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
      <div className="shrink-0 pl-3">{trailing}</div>
    </div>
  )
}

// The month's searches, in the sidebar meter's own visual language: the count
// over a hairline track, and colour only once it means something.
//
// Deliberately the same recipe rather than a second look for the same idea.
// Someone who has learned what the sidebar's bar going amber means should not
// have to learn it twice.
function SearchMeter({ used, limit }: { used: number; limit: number }) {
  const share = limit > 0 ? used / limit : 0
  const pct = Math.min(100, Math.round(share * 100))
  const fill =
    share >= 1 ? 'bg-destructive' : share >= 0.8 ? 'bg-chart-4' : 'bg-foreground/70'

  return (
    <div className="w-20">
      <p className="text-right text-xs tabular-nums">
        {used.toLocaleString()}
        <span className="text-muted-foreground">
          {' / '}
          {limit.toLocaleString()}
        </span>
      </p>
      {/* Track is the hairline token, not muted: muted and the card are within
          a shade of each other, so the unspent part would read as empty. */}
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// The Connectors page body. A thin client wrapper so the page itself stays a
// server component: it only exists to refresh server data after a connect or
// disconnect lands.
export function ConnectorsManager({
  connections,
  searches,
  telegram,
}: {
  connections: ConnectorState
  searches: SearchAllowance
  // Null on a deployment with no bot configured. The group disappears whole
  // rather than offering a connect button that leads to a bot nobody is
  // listening on.
  telegram: { paired: boolean; sendingCount: number } | null
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  // The search row wears the face of whoever is actually answering. Brave
  // today, the user's own Jina the moment they connect one.
  //
  // That is the point of the row. Nobody can connect Brave (Pipedream reports
  // it with proxy_enabled false), so by the usual logic it would never appear
  // here at all, and the one thing every agent leans on hardest would be the
  // only thing the page kept quiet about. A person should be able to look at
  // this page and know what their agent runs on, including the parts they
  // cannot change.
  const onOwnAccount = connections.jina_ai
  const refillMonth = new Date(searches.resetsAt).toLocaleDateString('en-US', {
    month: 'long',
  })

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
          together: the first says you already have it and what it runs on, the
          second says how to put it on your own account. Apart, the Jina row is
          an unexplained third-party sign-up. */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Search</h3>
        <StaticConnectorRow
          icon={
            onOwnAccount ? (
              <JinaIcon className="size-5" />
            ) : (
              <BraveIcon className="size-5" />
            )
          }
          label="Web search"
          state={onOwnAccount ? 'On your account' : 'Included'}
          detail={
            onOwnAccount
              ? 'Runs on Jina, on your own account. Nothing counts against a limit.'
              : `Runs on Brave, on our account. Fresh ${searches.limit.toLocaleString()} on ${refillMonth} 1.`
          }
          trailing={
            onOwnAccount ? (
              <span className="text-xs text-muted-foreground">No limit</span>
            ) : (
              <SearchMeter used={searches.used} limit={searches.limit} />
            )
          }
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
          trailing={
            <span className="px-3 text-xs text-muted-foreground">Built in</span>
          }
        />
      </section>

      {/* Last, and its own group, because it runs the other way from
          everything above it. Those are accounts an agent reaches into; this
          is an address Run sends to. The heading is word for word the one on
          a routine's own switch, so the two places read as one setting. */}
      {telegram ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            Where reports go
          </h3>
          <TelegramRow
            initialPaired={telegram.paired}
            sendingCount={telegram.sendingCount}
          />
          {/* The honest line, next to the thing it is about. Someone looking
              at a chat app on this page will assume their agent got a new
              place to talk, and it did not. */}
          <p className="px-0.5 text-xs text-muted-foreground">
            Your agents cannot use this. Run sends the reports, and the bot
            only listens for start and stop.
          </p>
        </section>
      ) : null}

      {/* The trust promise stays: this is the page where people hand over
          their inbox. Named to your accounts now that something on this page
          does send: without that word, the promise and the row above it read
          as a contradiction. */}
      <p className="px-0.5 text-xs text-muted-foreground">
        Agents read your accounts on their own, but nothing is sent or changed
        there without your okay.
      </p>
    </div>
  )
}
