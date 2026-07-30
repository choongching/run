---
name: write-copy
description: Write or edit any words a person reads (README, product copy, error messages, button labels, docs). Use before touching user-facing text, and whenever the founder pushes back on how something is worded.
---

# Writing copy for Run

The readers are non-technical. The founder is one of them, and reviews every
line as one. Copy that reads like a developer explaining a system is wrong even
when every word in it is true.

This skill exists because rewording is the most repeated, most expensive loop in
this project. One README line took four rewrites. One heading was quoted back
three times. None of it was a hard problem; all of it was a missing rule.

## The north star

Paul Graham's style. The README intro rewritten that way (PR #104) was the
first copy the founder loved outright instead of sending back. The shape:
the headline is a claim, not a description. One idea per sentence, all
declarative. A concrete example arrives early. The best line goes last, as a
turn ("Describing what you want is the setup"). Draft PG-shaped from the
start; descriptive-then-trimmed is how every rewrite loop began.

A second register exists for teaching sections (the README intro and journey,
PRs #116/#117, both accepted): the explainer voice from the founder's style
studies. Open on a contrast (what most tools do, then what this does), teach
with one analogy (calculator vs colleague), keep sequences pure (one arc,
plain verb phrases, no glue), and call back the section's key pair as the
closing line. PG for headlines and claims, explainer for sections that teach.
Whether that split is permanent is the founder's call; until they say
otherwise, treat them as two registers of one style.

## The rules

- **Plain sentences.** No jargon, no product-speak, no abstractions the reader
  has to unpack. Not "output artifacts", not "safe by default", not "surfaces",
  not "flows". If you would not say it out loud to a friend, do not ship it.
- **No em dashes.** Anywhere, in any Run write-up, doc, or UI string. Use a
  comma, a full stop, or a colon.
- **Cut to the chase.** Say the thing, then stop. The opening of the README went
  from 150 words to 55 and got better, not thinner.
- **Goal first, not story.** A heading names what the reader gets. "Track your
  runs" beats "See what you have used over the month". Explain the point of a
  feature, not its narrative.
- **Do not explain the machine.** The reader does not care that it composes a
  system prompt or streams frames. They care what it does for them.
- **Write it the way the person would say it back.** "It asks before it acts"
  survived. "It is safe by default" was rejected twice, because nobody talks
  like that.

## The two rules that would have saved today

### If a line fails two rewrites, delete it

A line that keeps coming back badly written is usually not clumsy. It is
redundant, and every rewrite is polishing something with no job to do.

The README intro proved it: two paragraphs were rewritten three times each
before the right move turned out to be removing them, because the bullets below
already said both things better. **After the second failed rewrite, stop
rewriting and ask whether the line should exist.** Propose the cut.

### Merge copy fixes immediately

The founder reads `main`, not your branch. A rewrite sitting in an unmerged pull
request does not exist.

"It is safe by default" was quoted back three times while the fix sat in an open
PR and I kept describing the new wording instead of shipping it. **Commit,
merge, then reply.** Never answer a copy complaint with a description of the
copy you would write.

## Rules earned in the 2026-07-30 review pass

- **The one-job test applies at every size.** Not just lines: whole sections
  and single UI strings die by the same test. "How it is structured" died
  because the journey already did its job; the composer placeholder died as an
  example because the chips below it were already examples. When a section
  fails, do not rewrite it: cut it and distill its one non-duplicated idea
  into a short paragraph in the surviving section's voice.
- **Status describes state, not order.** A section that grows one appended
  paragraph per session becomes a changelog in disguise. The tell is
  chronological glue: "also", "now", "used to", narration of fixed bugs.
  Rewrite from the present looking around (what stands, in one paragraph plus
  bullets); PROGRESS.md keeps the timeline.
- **Study a competitor's move, not their words.** When adapting copy from a
  reference screen, name the job each string does (Claygent's placeholder
  states the screen's contract), then write that job in Run's voice from
  scratch. Their actual words will usually fail our rules ("natural
  language", "AI Agent", speaking as "we").

## Recipes that survived review (2026-07-30 design pass)

- **Page subtitle: one line naming the page's job.** "What your agents always
  know." / "What your agents can use." The pair shape was chosen on purpose;
  match it for new pages. How-to sentences do not belong in a subtitle.
- **Empty state body: only the action.** What the thing IS lives in the
  subtitle; saying it twice is why these run long. "Add notes or files to any
  of your agents. They all end up here."
- **Tooltip on a self-evident control: one word.** An X's tooltip is
  "Close"; both "Close the panel" and a consequence clause were rejected in
  one round. The consequence recipe below is for controls whose OUTCOME is
  the unclear part.
- **Tooltip: the action or the consequence, once, no period.** "See this
  month's runs." beat two longer drafts. "Your agents will stop using this
  account" beat "lose access", which is permissions-speak.
- **Never name UI machinery** (panels, Configure, modals) in copy when the
  action can be said without it.
- **Facts live where they are true.** "Web search included" belongs on the
  Claude row, not in a page footnote, because Claude is where it comes from.
  Moving a sentence is often the fix, not rewording it.

## Checks before shipping a line

1. Read it aloud. If you stumble, or it sounds like a system talking, rewrite.
2. Scan for em dashes.
3. Ask what job the line does that a neighbouring line does not. No answer means
   cut it.
4. If it is a heading, does it name a goal or tell a story? Goals only.
5. Merge it before you talk about it.

## Where this applies

README and PROGRESS.md (both public, both plain English), every string in the
app, error messages (`lib/chat/errors.ts` has its own voice notes), button
labels, empty states, and the agent-facing prompt copy in
`lib/chat/onboarding.ts`, which tells agents to write in plain sentences and
avoid em dashes for the same reason.

Never push anything from `docs/` except `styleguide.md`; the rest is git-ignored
internal material.
