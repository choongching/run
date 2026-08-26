---
name: research-spike
description: Run a technical spike or research question for Run and write it up (cost comparisons, vendor choices, "is this normal", "what would it take"). Use whenever the answer will inform a build decision, before proposing any provider, library, or architecture.
---

# Research and spikes for Run

A spike ends in a decision the founder can argue with. That means the reasoning
has to be separable from the evidence, and the evidence has to be separable by
how much it can be trusted. Agreed with the founder on 2026-08-18 after the
web-search spike, where the recommendation was written in the same confident
voice as the measured findings, the criteria were never stated, and two
candidates were missed until he asked.

## The steps, in order

**0. Test the premise before accepting the brief.** The founder's framing is a
hypothesis, not a fact. Say plainly whether it held and by how much. "The fee is
real, invisible, and 49 cents" is a different brief from "search is too
expensive", and it changes what to build.

**1. Write the decision criteria, and their order, BEFORE gathering anything.**
Durability before price before quality, or whatever the question calls for. Skip
this and the ranking axis becomes whichever page got opened first.

**2. Label every claim by evidence layer.** Never let one layer borrow another's
confidence.

| Layer | What it is | How to treat it |
| --- | --- | --- |
| L1 measured | Their database, their code, a run I watched | Fact. Quote the number. |
| L2 primary | The vendor's own docs and pricing pages | Fact. Link it. |
| L3 secondary | Blogs, comparisons, forums | Mark unverified, say so in the text |
| L4 judgment | Mine | Mark as opinion, give the counter-argument |

An L3 price stated like an L2 price is the failure mode. If the number lives
behind a login, say that, and name the cheap test that would settle it.

**3. Cover the field explicitly.** Name every candidate considered, including
the dismissed ones, one line each on why. A bad dismissal must be visible.
(Jina died in a one-line footnote and turned out to be the cheapest option.)

**4. Check what is already in the codebase before proposing anything new.**
The existing middle layer (Pipedream), the existing tool seam
(`lib/tools/definitions.ts`), the existing meter (`lib/usage.ts`), the existing
skills. "Should this go through the proxy we already have" is a question the
architecture asks on its own and should never need to be raised by the founder.

**5. Separate findings from recommendation.** Findings state what is true.
The recommendation names its criteria and carries its own strongest
counter-argument, in the document, not held back for the follow-up question.

**6. End on what would change my mind**, plus the cheapest test that settles the
biggest unknown. Ten minutes with a free API key beats another hour of reading.

**7. Order the work so measurement comes first.** No optimisation before
instrumentation. If the meter cannot see the thing being optimised, fixing the
meter is step one.

## Measure against their own data first

Before reading a single vendor page, get the real numbers out of the database
with `mcp__supabase__execute_sql` (read-only) and out of the code with grep.
Prod and dev are the same Supabase project, so reads only, and see the
`supabase-ops` skill before anything else.

Real numbers reframe the question almost every time. In the web-search spike
they showed the fee was 40% of a search-heavy run but only 49 cents in total,
and they turned up two live bugs that mattered more than the vendor choice.

## Ask the API before you read the docs

On 2026-08-19 two questions had been open for a day because the vendor's
documentation did not answer them: can the proxy carry a key-authenticated
app, and which of our two candidates can a user actually connect. One call to
`pd.apps.retrieve(slug)` answered both in seconds, and the answer overturned a
decision already written into the plan: one candidate reports
`proxy_enabled: false`, so "both connectable" was never possible.

Documentation describes the intended shape. The API reports the actual one.
When a spike stalls on "the docs do not say", ask the system itself: metadata
endpoints, a `retrieve`, a HEAD request, a deliberately malformed call to read
the error. That is L1 evidence for the cost of one call, and it beats an
afternoon of L2 reading.

The same call also returned the official product logos, which is where the
connector icons came from. Look at the whole response, not just the field you
went for.

## Reading competitors: agreement is the answer, disagreement is the question

The founder handed over seven products' sidebars in one sitting (2026-08-26).
Read as a set rather than one at a time, they sorted themselves:

- **Where all seven agree, copy it and stop thinking.** The collapse control
  in the top row, the account and plan at the bottom, a soft filled rounded
  shape marking the current row. Seven independent teams landing in the same
  place is a settled question, and re-deriving it is spending judgment you
  need elsewhere.
- **Where they disagree completely, that is the real question, and it is
  yours to answer.** Their create actions were: nothing, a filled circular
  icon, an outlined full-width button, a `+` on the group label, and a compact
  pill sharing a row. No convention exists, which is exactly why ours had
  already been built and reverted once. Name it as unsettled to the founder
  instead of picking one and calling it best practice.
- **A flaw every one of them shares is the shape of the thing, not a fault in
  yours.** All seven had the same wide empty middle we had been treating as a
  bug to fix.

So: put the references side by side and sort the features into agreed, split,
and universally-flawed BEFORE proposing anything. It turns "here are seven
screenshots" into three decisions with different weights.

## Where it goes

- Spike docs live in `docs/<topic>-spike-<YYYY-MM-DD>.md`. **`docs/*` is
  git-ignored** except `styleguide.md`, so nothing internal is ever pushed.
  See the `never-push-internal-docs` memory.
- Shape, following `docs/knowledge-page-spike.md`: the question, the answer up
  front, findings with a source link on each, the recommendation, risks, open
  questions.
- If the founder asks for something readable, publish an HTML Artifact from the
  same content. Load the `artifact-design` skill first.
- Anything durable that came out of it (a corrected price, a platform limit, a
  live bug) goes into the relevant skill in the same session, or it is lost.

## Writing it

Plain sentences, claims not descriptions, **no em dashes**. See the
`write-copy` skill and the `pg-style-copy` and `no-em-dashes` memories.
Explanations of mechanics follow `explain-mechanics-plainly`: analogy, then the
real data, then "is it broken", then one honest signal.

Cut the branch before making any edit the spike leads to. Never work on `main`.
