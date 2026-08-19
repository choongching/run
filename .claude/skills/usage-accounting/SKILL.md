---
name: usage-accounting
description: Work on run usage, token accounting, cost, the usage meter, run history, or plan allowances. Use for any change to usage_events, pricing, the live usage channel, or the entitlements seam.
---

# Usage accounting for Run

Every model turn writes one row to `usage_events`. That table is a **ledger**:
it is what the founder bills against and what the meter reads, so it must stay
correct even when the thing it describes has been deleted.

The pieces: `lib/usage.ts` (pricing, `recordUsage`, `listRunHistory`),
`lib/usage-live.ts` (`subscribeToRuns`), `lib/entitlements/plans.ts` +
`assert.ts` (allowance), `components/usage/usage-meter.tsx` (meter and history
dialog), migrations `029`, `030`, `031`.

## The unit is a run, not a token

A run is one turn. That is what the user sees counted, and what a plan
allowance is measured in. Cost in dollars is computed and stored alongside it,
but never shown as the primary number.

## Cache tokens ARE the cost

The original bug: 118 turns recorded 990 input tokens in total, because only
`input_tokens` was summed. Prompt caching means the real volume arrives as
`cache_creation_input_tokens` and `cache_read_input_tokens`, priced at **1.25x**
and **0.1x** the input rate. One verified live turn recorded 10 input tokens
against 7,203 cache-creation tokens, a 26x understatement on that turn and about
79% across the table.

Always sum all four counters into `TokenCounts` and pass the whole thing to
`computeCost`. Tools render first in the cached prefix, so adding a tool moves
cost into the cache-write bucket rather than removing it.

`priceFor` matches a model by **prefix**, so `claude-haiku-4-5-20251001` is not
silently charged at the Sonnet fallback rate. Add new models to `PRICING` by
their prefix.

## What the ledger CANNOT see (audited 2026-08-18)

`computeCost` prices tokens. Anthropic bills three things, and we record one.
Anything quoted as "what a run costs" is understating it until these are added.

- **Web search: $10 per 1,000 searches**, charged on top of tokens, inside
  Managed Agents sessions too. Counted once per search whatever the result
  count; errors are not billed. Measured on 2026-08-18: 49 searches performed,
  $0.49 incurred, **$0 recorded**. On a search-heavy scheduled run the fee is
  about 40% of the run.
- **Session runtime: $0.08 per session-hour**, metered only while a session is
  `running`, not while idle. One session per routine run.
- **`web_fetch` is free.** Tokens only, no per-call fee. Worth knowing before
  anyone "optimises" it away.

There is no counter to read for this. The Managed Agents session
`model_usage` event carries the four token fields and nothing else: no
`server_tool_use`, unlike the Messages API. **The only way to count searches is
to tally `agent.tool_use` events named `web_search`**, in the same loop in
`lib/chat/run-turn.ts` that already turns them into activity rows.

Source: https://platform.claude.com/docs/en/about-claude/pricing

## PRICING drifts, so check it before quoting a cost

`PRICING` in `lib/usage.ts` is a hand-copied snapshot of a page that changes.
Verify against the pricing doc above whenever touching cost, and never quote a
dollar figure to the founder without checking first.

Known drift found 2026-08-18: **Sonnet 5 is $2 / $10 per MTok**, not the
$3 / $15 in the file, and the September increase was cancelled. Every Sonnet row
recorded before that fix overstates by 50%. Haiku 4.5, Opus 4.8 and the cache
multipliers were correct.

## AWAIT the write. Learned on hosting, 2026-08-19

This skill used to say the opposite, and the opposite is wrong in a way that
cannot be reproduced locally.

A serverless function is stopped once its response finishes, so
`void recordUsage(...)` is a promise that may never run. The first chat turn
ever streamed from Vercel proved it: the awaited search count landed, the
fire-and-forget usage row did not, and **the log showed no error, because there
was no error**. The work simply did not happen.

It is not only the ledger that depends on this. `getRunAllowance` counts these
rows, so a dropped row is a free run and the monthly cap silently stops
holding.

- `recordUsage` never throws, so awaiting it cannot break a turn.
- In the chat route the await sits inside the stream's `start` callback, and the
  route closes the stream only once that resolves, so the response stays open
  until the row is written.
- Scheduled runs never showed this because they do not stream: the route waits
  for the whole job before answering.

**The general rule:** on serverless, anything that must survive is awaited
before the response finishes. "Fire and forget" means "forget" more often than
it sounds.

## Two counters that must agree

`search_usage.searches` is written per search, awaited, at execution.
`usage_events.provider_searches` is written once per turn, at the end. They
count the same events, so `usage_integrity` (migration 042) subtracts them:

```sql
select * from usage_integrity where drift <> 0;
```

Drift means writes are being lost again, whatever the new reason. It is the
only reason the bug above was noticed at all: one of the two numbers had been
made reliable on purpose. Keep the pair, and prefer building a second
independent count over trusting a single one, whenever the number is money.

## Record on every turn, including the failed ones

`drainSession` in `lib/chat/run-turn.ts` is a thin wrapper that owns the
`TokenTally` and a try/catch/**finally**. The finally always writes the row,
with `status: 'failed'` when the turn threw. A turn that burned tokens and then
broke still cost money, so it still gets a row.

## Ledger rules

- **`agent_name` is a deliberate duplicate of `agents.name`.** Agents are hard
  deleted; `agent_id` nulls out via `on delete set null` and the history row
  would otherwise read as blank. Verified in a rolled-back transaction:
  `agent_id` nulls, `agent_name` survives. Snapshot any other display field the
  same way.
- **Writes are service-role, fire-and-forget, and never throw.** `usage_events`
  has no insert policy for `authenticated`. A failed usage write must never
  break the user's turn.
- **Reads use the caller's RLS-bound client.** `listRunHistory` takes the
  client as an argument for exactly this reason. Do not reach for service role
  to read.

## Gotchas (each cost real time)

- **`realtime.setAuth` before `subscribe`.** Without it the channel reports
  `SUBSCRIBED` and silently delivers nothing, because
  `realtime.subscription.claims_role` is `anon` and RLS filters every row. Get
  the session, `await supabase.realtime.setAuth(token)`, then subscribe. Check
  the `realtime.subscription` table when debugging: it shows the live role.
- **`date_trunc` predicates are unindexable.** The monthly allowance count goes
  against a plain `gte('created_at', monthStart)` range on `usage_events`, not
  against the `usage_monthly` view, so `usage_events_user_month_idx` is used.
- **`create or replace view` cannot insert a column mid-list.** It fails with
  "cannot change name of view column". `drop view if exists` then `create view`.
  Migration `030` records this.
- **Realtime needs the table published:** `alter publication supabase_realtime
  add table usage_events` (migration `031`).
- **Subscribe only while the panel is open.** Verified: zero open subscriptions
  when idle, one while the dialog is open. Do not hold a websocket for a number
  most visits never look at.

## Rendering split (decided, do not re-litigate)

The **meter is server-rendered** because it is always visible. The **history is
fetched on open** because most sessions never open it. Keep that split for
anything added here: always-visible goes in the server payload, on-demand stays
behind the click.

React 19 lint: seed the meter's state by keying it (`<UsageMeter
key={usage.used}>`) rather than syncing props into state in an effect.

## Allowance

`plans.ts` carries `runsPerMonth` and `getRunAllowance()`; `canRunAgent()`
exists but **is not enforced** anywhere yet. The numbers in the file (free 200,
pro 5000) are placeholders that users can already see. Two open decisions
belong to the founder: the real allowance, and whether running out should stop
a run or only warn.

## Verifying a change here

Not done until a real chat turn has run and the row is inspected: cache token
columns non-zero, `agent_name` and `thread_id` populated, `status` correct,
`cost` plausible. Use the `verify-in-browser` skill for the turn and
`supabase-ops` for the query.
