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
    //
    // TWO groups, not four. The page used to sort by a different question per
    // heading: "Your accounts" by who owns it, "Search" by what it does,
    // "Engine" by what powers it, "Where reports go" by direction. Gmail
    // qualifies under all four and sat under the first only because that
    // heading existed first, so nobody could predict where a new row lands.
    //
    // The subtitle already names exactly two things. Making those the groups
    // means the headings stop being a second taxonomy to learn.
    <div className="flex flex-col gap-6">
      {/* No heading on this group. It would have read "What your agents can
          use", which is the page subtitle word for word, two lines apart. The
          subtitle already labels this list; only the group that departs from
          it needs naming, which is the same instinct as a history list where
          status speaks only for the exception. */}
      <section className="flex flex-col gap-2">
        <ConnectorList
          connections={connections}
          onChanged={refresh}
          showBlurb
          only={['gmail', 'google_drive']}
        />
        {/* Web search and Jina stay adjacent, which is not cosmetic: Jina's
            line refers to a monthly limit that only the row above it states.
            Split them and the Jina row becomes an unexplained third-party
            sign-up. */}
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
          // Opens on what you have rather than on plumbing, and stays on one
          // line. Whose account it runs on is folded into the first clause
          // rather than given a sentence, because that is the fact the Jina
          // row directly below plays off.
          detail={
            onOwnAccount
              ? 'Search the web on your own Jina account. No monthly limit.'
              : `Search the web on our Brave account. Fresh ${searches.limit.toLocaleString()} on ${refillMonth} 1.`
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
        {/* Claude last in the group. It is the only row nobody can act on, so
            it sits after everything that has a button. The "Engine" heading it
            used to have is gone; the detail line now carries that job. */}
        <StaticConnectorRow
          icon={<Image src="/claude-icon.png" alt="" width={26} height={26} />}
          label="Claude"
          state="Always on"
          // Plain, and the job before the vendor. "Anthropic's AI behind every
          // agent" was a credit line, and a credit does not explain why this
          // is the one row with no button.
          detail="The engine behind every agent. Run is built on Anthropic's Claude."
          trailing={
            <span className="px-3 text-xs text-muted-foreground">Built in</span>
          }
        />
        {/* The trust promise closes the group it is about, rather than the
            page. It is also the ONE place the approval rule is stated, which
            is why no connector row above carries its own approval clause:
            said per row it sounds like a quirk of that connector, said once
            here it is how the product works.

            Two short sentences rather than one joined by "but". The promise
            should read like it was said out loud. */}
        <p className="px-0.5 text-xs text-muted-foreground">
          Your agents only read. Anything that changes something needs your
          approval.
        </p>
      </section>

      {/* Its own group, because it runs the other way from
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
    </div>
  )
}
