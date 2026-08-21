# Run Progress Log

A running, plain-English record of what has been done on this project, so anyone
(including future us) can open this file and know exactly where we left off.

**How this file works:** every work session ends by adding a new dated entry at the
top of the log below, written point by point. Never delete old entries, this is
the project's history. This file is public; never write secrets, passwords, API
keys, or internal-only plans in here.

**Where we left off:** Routine reports can now leave the app and arrive on
your phone as Telegram messages, which came straight from a test user saying
they were too busy to log in every day. You connect once, each routine has its
own switch, and a run that finds nothing sends nothing. A routine that stops
itself always says so. The agent gained nothing from this: it has no way to
reach Telegram, and the app says that out loud on the page where you set it
up. Everywhere an agent's details appear now says where its reports go.
Connectors dropped from four group headings to two, every row was rewritten to
say what the thing actually is, and one row was found to be claiming something
the product cannot do. A failed routine no longer prints a stack trace at
people. All of that is merged and live, and a speed and security audit ran on
top of it: speed came back clean, and both audits found one real defect each,
both in code written the same week. The one that mattered was ours to be
embarrassed by, a pairing link signed with the one secret we share with
Telegram; it now has a secret of its own and was re-verified on a real phone.
Timing the chat itself then showed 4.6 seconds of nothing on screen before a
reply begins, now down to 1.1, with the remaining wait measured and split
between what is ours and what is the AI thinking. Replies now show where they
came from, as a small badge carrying the site's own icon, with the icons
fetched by us so nobody else learns what your agent read, and each reply keeps
the pages behind it rather than throwing them away.
Next: the before-more-users pair, a
sign-up email provider and the database plan upgrade, plus two founder-only
items, connecting a real Jina account end to end and rotating the platform
search key.

Before that, agents search the web through our own provider rather
than Anthropic's, which costs about a twentieth as much, and it is live: the
app says plainly what search runs on, how much of the month is left, and how
to put it on your own account instead. Each agent has its own search switch.
Turning it on in production uncovered two older bugs, both now fixed: the
record of what a reply cost was being lost on hosting, which also meant the
monthly run limit was not fully holding, and a person saying no was being
reported to the agent as an error, which it reasoned its way around.
Routines are live, fire on their own in production, and can be changed after
the fact. The monthly meter counts what searching costs, which it never did
before, so the number you see is closer to the number you are billed. Agents do standing work on a schedule:
setting one up ends by asking what starts the agent off, you or the clock, and
after the first piece of work the agent offers to make that real on a card
showing the next three real run dates. Opening a routine now lets you edit
that schedule in place, with the next runs and the monthly cost answering
before you save. Scheduled runs read and report on their own; anything they
want to send still waits for you. The timer was armed on the night of
2026-08-01 and verified end to end, so nothing is outstanding to make
schedules work. The reasoning behind the search design is now written down,
in the README for readers and in an internal design note for whoever changes
the pipeline next, and the internal skills that describe security, answering
security questions, and dev cleanup have caught up with search and routines.
Two of the four search follow-ups closed: the free monthly search number
stays at one hundred, because a routine that runs out pauses itself and says
how to fix it, and the missing Jina dollar rate turns out to gate nothing a
user reads. What used to be a before-more-users trio is a pair: Google's app
verification came off the list once it turned out the Gmail and Drive sign-in
runs on Pipedream's own Google app rather than ours, so it was never a
blocker, and doing it on our own would cost a yearly assessment fee. The phone
check is done. Worth watching now that agents
can spend while nobody is looking: the monthly meter, which as of 2026-08-18
finally includes the cost of searching the web.

The core is validated and the interface has been
rebuilt around it. On 2026-07-26 the founder ran the whole loop on their own
real Gmail and Drive and it held up: it summarized and critiqued a real Drive
document, drafted email replies that read well, turned emails into a
downloadable document, and drafted a reply that the founder approved and
actually sent to a real person. On 2026-07-27 agents gained a knowledge base,
getting started stopped needing an administrator, and how many agents you can
create became a matter of plan rather than rank. On 2026-07-28 a knowledge
source can be set to apply to every agent you own, connectors got their own
page, the account moved behind the avatar, and the whole shell was redesigned:
a flat sidenav, a configure panel that docks beside the conversation instead of
covering it, and one consistent card treatment across every page. Later on
2026-07-28 the app was audited end to end for speed and made meaningfully
faster: navigation no longer hangs on a dead click, the session is checked
locally instead of over the network, and the chat page went from about eight
database round trips to two. On 2026-07-29 people can finally see what they
have used: the app had been recording only a tiny fraction of what a
conversation actually costs and now records all of it, and a meter beside your
account shows how much of the month is left and opens into a history of every
run an agent has done for you. Later the same day, setting up an agent gained a
checkpoint: it now shows you the name and the job it wrote for itself and waits
for you, and every failure in the chat was rewritten to be readable by a person.
Late on 2026-07-29 into 2026-07-30 the app went through a second, deeper speed
pass (every page paints instantly and streams its data in, identity is checked
locally everywhere, likely-next pages are fetched before the click, a chat
opens in one database round trip) and a consistency pass over Settings,
Knowledge and Connectors: one centered column everywhere, a Claude row on the
Connectors page so the product names the AI it runs on, tooltips on hover,
quieter empty states, and much shorter words. Signing in now reacts the moment
the button is pressed. The README opening was rewritten in the plain
declarative style the founder wants all Run copy to follow from now on. The
session closed with a security audit (every commit ever made is clean, no key
or password has ever been in the repo) and standing guards: GitHub push
protection plus a pre-commit hook that blocks anything shaped like a secret.
There is now a way back in for someone who forgets their password, and a
Password section in Settings; sending those reset emails in production needs
an SMTP provider connected to Supabase, which is a deploy-day task.
The allowance questions are settled: 200 runs a month is the real number, and
using the last one stops the next run with a plain sentence and the refill
date. A performance gate now runs at every phase end so speed cannot quietly
regress, and the front page redirects a signed-out visitor in a few
milliseconds instead of flashing an empty app.
Then, late on 2026-07-30 into 2026-07-31, Run went live. The app deployed to
Vercel in the same region as its database, the founder signed in on the
production URL and ran real agent conversations, and the whole verification
gate was re-run against the live site: every page and API refuses strangers,
security headers are on, and every speed budget passes over the real
internet. The database lockdown that had been waiting for approval was
applied and verified, and passwords got a show and hide toggle plus an
eight character minimum enforced in three layers. From now on, every merge
to main deploys itself.
On the morning of 2026-07-31 the app moved onto its real address,
https://tryrun.today, and the first-time experience got its polish: a calm
building moment when an agent is created, a blank-page bug fixed for good,
Delete on every sidebar row so nobody is ever trapped, and a warmer voice
through the composer and the setup card.
That evening the chat learned to show its work and the usage story grew up:
web searches now appear as real steps folded into a quiet block, a small
ring in the composer answers for the chat while the sidebar meter answers
for the month, and the usage panel was redesigned around its jobs, opening
with where the month went, agent by agent.
Late that night Run learned to be a phone app: a written mobile system
(one breakpoint, a 44px tap floor, 16px inputs, full-bleed surfaces, a
three-tier type ladder) and every surface reworked to it, with the chat and
the Configure panel becoming true full-screen experiences.
Next step: the before-more-users trio: an email provider for sign-up and
reset emails, Google's app verification so new people can connect Gmail and
Drive, and the database plan upgrade that unlocks leaked-password checking
and backups.

---

## 2026-08-21 (evening): Answers now show where they came from

- Until today a source in a reply was a bare underlined word in the middle of
  a sentence, which quietly pretends the source is part of what you are
  reading. It is a small badge now, sitting at the end of the claim it
  supports: the site's own icon and its name, in small type you can skip
  without losing the sentence. Ten of them appear correctly in a real
  conversation.
- The icons come from us, not from anyone else. The easy way to show a site's
  icon is to ask Google for it, which quietly tells Google every site your
  agent read, tied to you. We fetch and cache them ourselves instead, so your
  browser only ever talks to Run and nobody learns what your agent looked at.
  It cost about a day more than the easy way and it is the version we can
  explain.
- **That fetching is the most dangerous thing in the app**, and it was built
  accordingly. A server that fetches whatever address it is handed can be
  tricked into fetching things only a server can reach, so the rule is the
  reverse of the usual one: an address has to look like a perfectly ordinary
  website before we will touch it, and everything else is refused. Twenty
  hostile addresses were tried against it, including the ones that would
  matter, and all were refused.
- **Answers also remember what they were based on now.** Search results used to
  be read once and thrown away, so the reply kept the words and nothing else.
  Each reply now keeps the pages behind it, with their titles and dates.
- That was the piece everything else was waiting on. Without it, counting
  sources would have meant counting the links the agent happened to write, and
  in a real report that undercounted by half.
- **Two things only turned up by running it**, which is the argument for doing
  so. When a site refuses us its icon we used to answer with an invisible
  image, which the browser treated as success, so the fallback symbol never
  appeared and those sites showed an empty space. Nothing looked broken and
  nothing was right.
- And the stored pages are what the agent **looked at**, not what it **used**.
  A search for chip news came back with four relevant results and one politics
  live blog that happened to mention datacenters; the agent sensibly ignored
  the last one, and we keep it anyway, because nothing tells us which results
  an answer leaned on. So the next piece of this has to say "the pages behind
  this answer" and must never claim a precise number of sources.
- Merged to `main` via pull request #254, with the database change applied
  first and checked: existing conversations untouched, and the new field
  invisible to anyone but its owner.

## 2026-08-21 (later still): The chat stopped looking dead while it thinks

- Measured what happens between pressing send and seeing anything, which we
  had never actually timed. On the live site it was **4.6 seconds of nothing**,
  and on a fresh conversation still nearly 3. The reply itself then arrived in
  about a second and a half, smoothly, with no stalls. So the waiting was not
  the agent being slow; it was the app saying nothing while the agent worked.
- Worse, the silence grows the longer a conversation goes on, because the agent
  has more to read before it can start. The wait gets longest exactly when a
  chat has become worth having.
- Fixed by having the app speak first. It now opens its reply the instant it
  starts work rather than when the agent produces a first word. **The wait
  before anything appears went from 4.6 seconds to 1.1**, and the total time
  did not change at all, which is the honest description: nothing got faster,
  the screen stopped pretending nothing was happening.
- Measuring it also told us where the time actually goes, which we had only
  been guessing at: about a second is our own database work, about four seconds
  is the AI thinking, and about a second and a half is the reply arriving.
  Only the first is ours to fix.
- That first second is now a costed decision rather than a hunch. Removing it
  means changing how the busiest part of the app reports failures, so it is
  written down with its price rather than done in passing.
- Merged to `main` via pull request #252 and deployed, then measured again on
  the live site to confirm the number moved.

## 2026-08-21 (later): Two audits, and both found our own code

- Ran a speed audit and a security audit after the delivery work shipped. Both
  turned up something real, and in both cases it was code written days earlier
  in this same stretch of work rather than anything old. That is the finding
  worth repeating: the newest code is the most suspect, and reviewing it with
  the same thinking that wrote it reproduces the mistake.
- **Speed came back clean.** Every page puts its first content on screen in
  under a fiftieth of a second, well inside the budget, and the two pages that
  gained new database work this week are the two fastest of the six. That is
  not luck: the new queries were added alongside the existing ones rather than
  after them, so they wait together instead of queueing. The home page is now
  the slowest thing we have and nobody has touched it in months, which is where
  the next look should go.
- **The speed audit found a leak anyway**, of a kind no page timing would ever
  show. Two of the four places that wait for you to finish connecting an
  account kept waiting after you navigated away, for a full three minutes,
  asking every two seconds. It cost nothing on the page being measured and
  everything on the page you had left.
- Fixing it fixed something you can feel. All four now share one piece of
  machinery that stops when you leave, and that also checks the instant you
  look at the tab again. Browsers slow a hidden tab's timers to about once a
  minute, and every one of these flows sends you somewhere else, to a popup or
  your phone. So "this updates itself" could sit still for a minute after you
  had already finished. That is very likely part of why pairing appeared to
  hang earlier in the week, which we had put down entirely to an expired link.
- **The security audit found one real weakness, and it was ours.** The link
  that connects your Telegram to your account is signed, so we can tell it came
  from someone who pressed the button in Run. It was being signed with the one
  secret we deliberately hand to somebody else: the value Telegram itself holds
  so it can prove its calls to us are genuine.
- Anyone holding that value could have made a valid link for any account and
  started receiving that person's reports. And the account number was no
  obstacle, because a separate check showed every signed-in person can read
  every account's id. Neither half was visible by reading the code; both came
  from running things and asking who else holds what.
- Fixed by giving the signature its own secret, which nobody outside Run has.
  Verified three ways before shipping, then verified again on the live site by
  disconnecting and re-pairing a real phone.
- Everything else passed, and passed by being tried rather than by being read.
  Every part of the interface refuses a stranger. The bot still answers only
  two words and passes nothing anyone types to an agent. The table holding
  Telegram connections refuses to be written to even when asked directly by a
  signed-in account. Agents still cannot act without approval, scheduled runs
  still cannot write at all, and none of the server's secrets appear anywhere
  in what a browser downloads.
- Two things are left for a decision rather than a fix: whether everyone signed
  in should be able to see everyone else's profile, and whether the bot's stock
  reply needs a rate limit. Both are written down rather than quietly dropped.
- Merged to `main` via pull requests #249, #250 and #251, and deployed. The new
  signing secret is set in production.

## 2026-08-21: Reports can leave the app, and the app says so everywhere

- **Routine reports can now reach you on Telegram.** A real test user said it
  was troublesome to log in just to check on their routines, and later that
  they were too busy to log in every day. That is not one person's quirk, it
  is the definition of the customer routines were built for, so daily logins
  were the wrong thing to be measuring. Channel options were explored before
  anything was built. Email was costed and set aside for now: the providers
  that are generous in testing are not generous in production for this shape
  of use. Telegram won on being free, instant, and already on the phone.
- **How it works, in one line each.** You connect once. Each routine has its
  own switch. A report arrives the moment a run finishes. A run that finds
  nothing sends nothing, and the next real report says how many quiet runs
  there were, so silence never reads as breakage. A routine that pauses
  itself always says so, because a routine that dies quietly is one you keep
  waiting on.
- The pairing link is short-lived and one-time. The bot understands exactly
  two words, start and stop, and answers everything else with the same canned
  line. Blocking it in Telegram turns delivery off with nothing needed from
  us.
- **Three problems were found and fixed before this shipped**, each worth
  recording:
  - The chat id was first stored on a table every signed-in person can read.
    A live check as a made-up user returned every row. It moved to a table of
    its own with one policy: you can read your row and nothing else, and
    nobody can write one at all.
  - The most common way a routine dies, three failures in a row, was the one
    death that sent nothing. Now it tells you.
  - The marker an agent writes when it found nothing was matched too
    loosely, which silently swallowed a real report whose last sentence
    happened to end with the words "nothing new". It is matched as a whole
    line now, with tests.
- **Telegram is now visible everywhere an agent's details are shown**, because
  transparency was the point. It has its own group on Connectors, deliberately
  not filed under the accounts an agent can reach into, since the agent gained
  nothing here: it has no way to send to Telegram and nothing it can be
  tricked into saying gets there. A routine that delivers says so on its own
  row and inside its agent's Configure panel. Connectors is also the first
  place you can disconnect from the app rather than from Telegram.
- **Connectors went from four group headings to two.** Each of the four sorted
  by a different question, so nobody could predict where a new row would land.
  The page subtitle already names two things, so those became the groups. Only
  the group that departs from the subtitle carries a heading.
- **Every connector row was rewritten.** They had been describing a state or
  naming a benefit without ever saying what the thing was. One of them was
  simply wrong: Google Drive promised to "turn documents into new ones", which
  it cannot do, and nothing an agent writes lands back in Drive. Checking the
  claim against the code is how that surfaced. Two rows also ended in their own
  approval clause; approval is how everything works, not a quirk of those two,
  so it is stated once at the foot of the page.
- **A failed routine no longer shows a stack trace.** The failure text was
  being stored raw and printed to the page, so a non-technical person was
  handed something they could not act on. It goes through the same translator
  the chat has used since six routes were caught doing this, so a routine
  failure now reads like the same failure in a chat. The real error is logged
  rather than lost.
- **Researched whether we should teach people how to write prompts**, after
  seeing a competitor put "Tips for Writing a Good Use Case" beside a progress
  bar. The answer is no, and the reason is structural: that product takes one
  shot at your description, so a thin one produces a bad bot with no way back.
  Ours asks questions and shows you a card to edit before anything is saved.
  Checking what the mature products actually do supported this: Vercel keeps
  its prompt guidance on a blog, not in the app, and its design system treats
  the empty state as the place to teach. We already do that in both places it
  matters.
- **Slash commands were considered and declined.** GitLab has deprecated them
  in its own AI chat, and the pattern libraries name three places not to use
  them: products whose users never learn command syntax, products with few
  actions, and mobile-first composers. Run is all three. This is the third
  proposal of that shape to be cut, after the connector chip row and the
  composer token, so the reasoning is written into the internal build notes
  rather than argued again from scratch.
- Small fixes along the way: a routine's icon tile was too short for its
  two-line row and sat visibly high; the status dot was the only thing on the
  row carrying meaning and the only thing with no way to read it, so it is
  bigger now and says what it means on hover; the Routines subtitle said the
  schedule twice.
- The agent Instructions box now explains the one thing nobody can work out by
  looking at it: what you type is only the base, and your setup answers, the
  agent's voice and its knowledge are added underneath.
- Verified against the founder's real phone and a real paired account, on
  desktop and at phone width.
- Merged to `main` via pull request #247, on top of the delivery work already
  merged as #245 and #246.

- Closed two of the four follow-ups the search work left open, both by
  checking rather than assuming:
  - The free search allowance stays at one hundred a month. The math: a
    daily research routine makes sixty to one hundred twenty searches a
    month, so it straddles the cap, but the failure is safe. A routine that
    would search checks the allowance before it runs and pauses itself with
    the reason and the fix. The full hundred costs about fifty cents a user
    a month, so the cap is generous and the pause message does the selling
    for connecting your own account. No code change needed.
  - Jina still does not publish its dollar rate outside the dashboard
    (rechecked on their own pages), but a sweep of the app found no line a
    user reads that depends on the number. Verifying it stays a ten minute
    founder task, for the record rather than for the product.
- Audited all seventeen internal skills against what has shipped. Fourteen
  held up; three had gone stale and were updated: the security sweep now
  knows the web search tool and its strip layer, the one API route that
  rightly has no user behind it, the three new tables, the two new server
  keys, and carries the search key rotation as an open item; the
  security-answers skill got a re-verified tool list and a straight answer
  for unattended runs; dev cleanup learned that deleting a test agent takes
  its schedules with it and that the billing ledgers are history, never
  test data. Merged to `main` via pull request #239.
- Wrote the intent behind the search pipeline down in two places, at the
  founder's ask. The README's search section gained three claims in plain
  language: the reading is the expensive part, not the search; the five
  snippets are too short to answer from on purpose, so answers come from
  pages the agent actually opened; and nobody is paid to sort the results
  twice, because picking from five is judgment the agent already applies.
  The full reasoning, with file pointers and the conditions for revisiting
  each decision, lives in an internal design note. Merged to `main` via
  pull request #240.
- Answered the founder's reranker question with sources: Jina sells a model
  that re-sorts results by meaning and bills per token; Brave offers rules
  that boost or bury results by site, free. Run deliberately uses neither,
  and now the README says why.
- Also merged the previous session's day-close log, pull request #238.

## 2026-08-19 (evening): Shipped, and two bugs the ship uncovered

- **The search work went live.** Pull request #234 merged after the key was set
  in hosting, and production now searches through our own provider. Verified on
  the real site straight after: the search ran on Brave, Anthropic's built-in
  stayed off, and the month's count moved. The saving is real from today.

- **Turning it on found a bug that had nothing to do with search, and it was
  the more serious one.** The record of what a reply cost was being written in
  a way that does not survive on hosting. A serverless function is switched off
  the moment its answer finishes, and that record was posted on the way out the
  door rather than handed over, so it was thrown away. Nothing errored. The
  logs were clean. It had been true since the meter was built and could not be
  seen locally, because a laptop never switches off mid-thought.

- **That was not just an accounting problem.** The monthly run limit counts
  those records, so a lost record was a free run and the cap quietly stopped
  holding. The very turn that revealed it was itself a free run.

- **It was only noticed because two numbers disagreed.** Searches are counted
  twice by different routes: once the moment a search happens, and once at the
  end of the reply. The first was built to be reliable on purpose. When they
  read 8 and 7, the gap was the missing record announcing itself. That
  comparison is now a permanent check, so the next time writes go missing, for
  whatever reason, something says so instead of nothing.

- **A person saying no was being reported to the agent as an error.** A routine
  card was declined and the agent read the decline, decided the error must be
  mistaken, and proposed the same routine again, explaining its reasoning on
  screen. A model works around errors and obeys outcomes, and we had labelled a
  decision as a fault. Declines are now reported as ordinary results with the
  decision stated as final.

- **A decline also left no trace.** The card vanished and nothing recorded that
  you had said no, which is exactly how the same thing gets proposed again
  without anything looking wrong. The conversation now keeps a line, with its
  own mark, muted rather than red, because refusing something is normal and the
  approval gate working is not a failure. The same change fixed approvals,
  which were drawing their lines without keeping them, so an approved action
  lost its record on reload.

- **Agents no longer show their working.** No tool names, no talk of function
  results, no narrating what they are about to do. Worth recording that this
  fix alone would have hidden the decline bug rather than solved it; the leak
  is what made it visible.

- **Written up properly.** The README gained two diagrams, one for what happens
  when an agent wants to change something and one for where a web search comes
  from, three new questions in the security FAQ, and the trust list now says
  what happens when you say no. Every diagram was rendered through the real
  parser rather than eyeballed.

- **Routine runs are listed by what they found again.** The Routines page
  headlines each run with its first line, and a run that uses tools writes
  twice: a line before it goes to work, then the report. So the page had been
  listing runs as "Let me get more details on the most relevant stories:" for
  six of the last eight. The headline now comes from the closing block rather
  than the whole reply. Fixed structurally rather than by skipping phrases,
  because the lead-in is not a wording problem, it is a different block. Old
  rows are left as they were: they are what the page really showed at the time.

- **One earlier worry turned out to be wrong, on the evidence.** The free plan
  allows 100 searches a month, and the concern was that a daily routine could
  spend six a run and run dry by the middle of the month. The actual numbers
  say otherwise: of 236 runs, seven searched at all, averaging 1.71 searches
  when they did, never more than three. The worry was arithmetic from a ceiling
  rather than a reading of behaviour. Worth revisiting when somebody other than
  the founder is using it.

- **The lessons went into the skills**, not just this log, so the next session
  inherits them: await anything that must survive a response, build a second
  independent count when the number is money, treat `is_error` as a permission
  flag rather than a mood, re-verify a fix when you change the shape of what it
  keys off, read the whole branch before opening it, and ask an API before
  reading its documentation.

## 2026-08-19: Search moves onto our own provider, and says so

- **Why.** Anthropic's built-in web search costs $10 per 1,000 searches on top
  of tokens. Measured from our own database, that was about 40% of what a
  search-heavy scheduled run costs. Brave sells the same thing at $5 per 1,000
  with its own index and a recency filter; Jina sells it at roughly a
  twenty-fifth of that but cannot ask for recent results. Agents now search
  through Brave on our account, and anyone who wants to can connect their own
  Jina account instead.

- **A research spike settled the choice before any code was written.** Both
  providers were run against the same real queries. Brave came back with this
  week's wire copy where Jina returned real outlets carrying months-old pages,
  with no parameter to fix it. Since the one agent in this product that
  searches is a news agent, freshness won over price. Jina stays as the option
  for anyone whose volume makes price matter more.

- **Recency is something the agent decides per question**, not a setting. Asking
  for "this week" fixed the news query and ruined a shopping comparison, so the
  tool takes it as an argument and the description tells the agent when to
  reach for it.

- **Two bugs were found that had nothing to do with search.**
  - A turn that made more than one tool call was abandoned halfway. The run
    loop had no memory of which calls it had already answered, so when the
    session repeated a request it had already been given results for, the loop
    concluded there was nothing left to do and stopped while the agent was
    still working. The visible symptom was an agent that searched three times
    and then said nothing. This affected two Drive reads or two Gmail searches
    in one turn just as much; it had simply never been tried.
  - The transcript claimed work that never happened. A step is written when the
    agent announces a tool, which is before the tool runs, so a call that
    failed still settled into the history as a finished step. Steps that did
    not run are now taken back.

- **Searches are counted the moment they happen**, in their own record, not
  folded into the per-turn tally. The tally is written once at the end and can
  be lost when a stream closes, spans several calls per conversation turn, and
  ignores turns that failed. Any of those would have meant giving searches
  away. Aborting a stream mid-search was tested: the turn recorded as failed
  and the search still counted.

- **Cost keeps its own column at its own price.** Reusing the existing one
  would have charged Brave's searches at Anthropic's rate and made what the
  ledger says about that column untrue.

- **Turning our search on is a deployment fact, not a list of names.** The
  switch is whether the search key is configured. A staged-rollout list could
  not protect against the one dangerous deploy, where the list says yes and the
  key is missing, because that failure is invisible: the agent simply stops
  finding things. With no key the built-in search stays on and nothing breaks.

- **Only Jina is connectable, and that is a finding.** Pipedream reports Brave's
  app as one its proxy will not carry, so a person's Brave key could only reach
  Brave by passing through us, and not holding anyone's key is the entire point
  of connecting through Pipedream. Jina's app is proxy-carried, on exactly the
  address our code calls.

- **The Connectors page says all of it out loud.** A Search group shows what
  search runs on, wearing that provider's own mark, with a meter for the month
  in the same visual language as the runs meter beside your account. Two
  sentences elsewhere had quietly gone false and were rewritten: web search is
  no longer "always on", and it no longer comes from Anthropic.

- **The chat says the same things.** Steps carry the mark of whatever did the
  work, stored with the step so a reloaded conversation looks like the live
  one. Running out of searches now puts a card in the thread offering the fix,
  rather than leaving the way out inside a sentence the agent might not repeat.

- **Each agent has a web search switch.** Off means the tool is never given to
  it, checked again at the moment of use because a conversation started before
  the switch was flipped would otherwise still carry it. Reading a link you
  paste deliberately survives the switch being off: pasting a link is asking
  for that page, not asking the agent to go looking. That had been wired to the
  same flag, so turning search off would have stopped it too.

- **Verified live throughout**, against the real database: the allowance blocks
  exactly at the limit and a refused search costs nothing; an aborted stream
  still counts; the switch writes what it should and leaves the other tools
  alone; a search runs on our provider with Anthropic's turned off; and reading
  a pasted link still works with search switched off.

- **Reading the finished branch back turned up two more.** The retracted
  transcript step had stopped being retracted for the one case that prompted
  it, because that case had since changed shape. And a provider having a bad
  day took the whole turn down, since this tool returned before the shared
  error handling every other tool falls into; a failed search should cost a
  sentence, not the reply.

- **Still to do before this is worth anything in production:** the search key
  has to be set in the hosting environment, or production quietly keeps paying
  the old price. Connecting a real Jina account has not been tried end to end,
  only shown to be supported. And the phone-width check on the new switch and
  meter needs a real device.

- **Opened as pull request #234 and deliberately not merged**, at the founder's
  call, so the key can go in first and the change lands working rather than
  landing and waiting. The database changes are already applied, since this
  project shares one database between development and production. That is safe
  and was meant: the new table and columns are additions nothing reads yet. One
  side effect worth knowing, because it already happened to real conversations:
  the migration that makes open chats pick up the new tools cleared their
  sessions, so they rebuilt on their next reply. In production they rebuilt
  exactly as before, because the code that changes them has not shipped.

## 2026-08-18 (evening): Choosing a search provider, by measuring instead of reading

**Why we are doing this at all.** Searching the web is charged separately from
thinking, at $10 for every thousand searches. On a scheduled news run that fee
is about 40% of what the run costs. Today it is pennies because there is one
person using it; at a thousand people with a daily routine it is about a
thousand dollars a month.

**We tested two search companies against two real questions.** Not a benchmark.
Two questions that fail in different ways: "Iran Israel strikes casualties",
which fails when a search returns something trustworthy but old, and "JBL Charge
6 vs Flip 7", which fails when it returns pages written to rank rather than to
inform. A provider that survives both survives the work our agents actually do.

**Brave won, and not on price.** It can restrict results to a time window and
Jina cannot. Asked for the past week, Brave returned this week's wire copy from
AP, CNN and Al Jazeera. Jina returned real outlets but pages from months ago,
with no setting that could fix it. For a weekly news agent that is not a lower
score, it is the wrong answer delivered confidently.

**One finding changed the design.** The same freshness setting that fixed the
news question destroyed the shopping one, which came back as foreign-language
blogs and a review of a different product. So recency cannot be something we
configure. It is now something the agent chooses per question, because only
whoever can see the question knows whether last week matters.

**Jina stays, as a choice rather than the default.** It is roughly twenty five
times cheaper, which is the right trade for someone who searches a lot and cares
less about recency. That is what the connectors are for: bring your own account
and your searches stop counting against the monthly limit.

**Four things the documentation said about Jina turned out to be wrong**, and we
only found them by calling the API: search needs a key, billing is a flat rate
rather than one that grows with the pages read, it returns ten results and not
five, and one of its parameters is rejected below a minimum nobody documents.
Two of the four were in Jina's favour.

**Built so far, reaching nobody.** The provider module, and the search tool
itself, are written and switched off. Every agent still uses the built-in
search exactly as before, and one setting turns the new one on for one account
when we are ready to watch it work.

**Guardrails, since this is the first tool that brings outside text into an
agent through us.** Search results are written by strangers. Every snippet is
stripped of hidden characters, links to anywhere other than the result itself,
and anything imitating the markers we use to fence quoted material, before it
reaches the agent behind a notice saying to treat it as reference and never as
instructions. Two bugs in that stripping were caught by its own tests: newlines
were welding words together, and script contents were surviving as text.

**Also new:** a limit of six searches per reply as a runaway guard, and results
that carry their source and link so the agent can say where an answer came from.
That last one is not decoration. Anthropic's own search marks its sources
automatically and ours cannot, so attribution had to be asked for or it would
have quietly disappeared.

**Verified:** 75 checks across the sanitiser, the two provider adapters, the
tool's registration, the fence and the rollout switch, plus one live search that
returned five results in about a second with every rule holding on real data.

**Deliberately not built:** caching similar searches. It saves half a cent per
hit while the same results sitting in a reply cost about a hundred times more,
the questions our agents ask are dated and would be wrong to reuse, and matching
questions by meaning quietly confuses opposites like "safe for children" and
"unsafe for children". Parked with a note on what would change the answer.

## 2026-08-18: The meter learns what a search costs

**The bill had a line nobody could see.** Anthropic charges for web search
separately from tokens: $10 per 1,000 searches, on top of everything else. The
meter only ever priced tokens, so that line was missing from every cost figure
in the product. Reading it out of our own database: 49 searches since 26 July,
about 49 cents, none of it recorded. On a scheduled news run the fee works out
at roughly 40% of what the run costs.

**Now it is counted.** Nothing in the usage stream reports a search, so the
count is taken where a search is actually visible: the same loop that writes
"Searched the web for ..." into the chat. The fee lands in the run's cost, the
count gets its own column so it can be checked, and old rows keep the cost they
were written with. History is not rewritten.

**Reading the schema out loud turned up four things worth fixing.** The session
started as a walk through the database, table by table, in plain language. That
walk is what found them.

- **A routine never wrote down when it last ran.** The column was read in two
  places and set in none, so after fourteen successful runs it still said
  nothing. The agent was handed last week's report with no date on it, and had
  no way to know whether "since last time" meant a day or a month. Now written
  on success, beside the report it dates.
- **Web search was on for every agent no matter what its settings said.** Each
  agent recorded "search: off" while every session was opened with search on,
  and the session wins. The setting is now real. Turning it on by default and
  correcting the four existing agents was deliberate: there is no switch in the
  interface yet, so enforcing the old recorded value would have silently
  switched search off for everyone, and the weekly news routine would have come
  back empty looking like a broken agent rather than a setting.
- **Sonnet 5 was priced 50% too high** in the meter, at old rates. Corrected,
  with the date it was checked written next to it, because that table is a copy
  of a page that moves.
- **A status dot that never rendered** was fixed the day before, same habit of
  looking closely.

**A spike on replacing the search provider, and an honest correction.** Brave,
Serper, Tavily, Exa, Firecrawl and Jina were all priced against what we
actually spend. The finding that shaped it: page reading is free and only
searching carries a fee, so the two should be split rather than replaced
together. The provider is not settled, and deliberately so. Two cheap tests
decide it, and both use our own real queries rather than anyone's benchmark.

**How research gets done here changed too.** The first version of that spike
stated a recommendation in the same confident voice as the measured facts. It
now labels every claim by how far it can be trusted: measured from our own
data, quoted from a vendor, unverified, or opinion. That rule is written down
as a skill so it holds next time. A price quoted by resellers but published by
nobody is exactly the kind of number that should not decide anything.

## 2026-08-17: Change a routine's schedule where you read it

A routine's schedule could be set once, in conversation, and never touched
again. To move a Monday report to Tuesday you deleted the routine and asked
for a new one. Now you change it where you already read it, in the routine's
own window.

- **The schedule became a field.** Open a routine and the schedule sits under
  its name as a sentence you can read, with Change beside it. Change opens an
  interval, a unit, the days of the week as seven toggles, a time, and, when
  the interval is more than one, the date it counts from. Underneath, the
  sentence it all adds up to, in the same words the routine has always used
  to describe itself.
- **The consequence is visible before you commit.** The panel beside the form
  answers with the next three real run dates, what the next run used to be,
  and what the change does to the monthly cost. Undo puts it back. Closing
  with unsaved changes asks first.
- **No cron field, deliberately.** Cron cannot say "every 2 weeks on
  Wednesday" or "every 10 days", which are the things people actually ask
  for, and a second way to write a schedule would mean a second thing to
  interpret it. One interpreter, one set of words.
- **Real pickers, one control height.** The first version wore the browser's
  own time and date inputs, which brought their own type, their own height
  and their own blue to a row of our controls. They were replaced with a
  clock that opens on the hour it is set to and a proper calendar, both built
  to the app's own control height. Along the way the app-wide selects turned
  out to be missing the 44px tap floor on a phone, so they got it.
- **Pause and Delete say their names.** They had been two unlabelled icons in
  the footer. They are now words, sitting beside Jump to the chat, with Save
  alone at the other end. Forget, which throws away what the routine
  remembers, now asks a second time before it does.
- **Four bugs found by looking rather than guessing.** A schedule starting in
  the future used to fire before its own start date. A start date of the 30th
  of February passed validation. A daily rule with a weekday filter described
  itself as "every day", which was a lie already live in production. And the
  status dot on every routine row had never rendered: it was a plain span,
  and a span ignores width and height, so all anyone ever saw was 2px of its
  own border stretched down a line.
- **"About 0 runs a month."** A routine set to every two months rounded its
  own cost down to nothing, which reads as free. The sentence now changes its
  unit instead of its number: "About 6 runs a year", and below it, what it
  was.
- **Verified against the real thing.** Two harnesses (79 checks) cover the
  date arithmetic and the field's own logic, and the whole modal was driven
  in a browser: toggles, unit changes, the calendar, Undo, the close guard.
  The save path was proven end to end on a real routine, watching the
  database: the schedule written matched what the window promised, the next
  run time was recomputed from it, and the routine was put back exactly as it
  was found.

---

## 2026-08-01 (night): Setup asks what starts the agent off, and the timer goes live

An evening that produced more cut work than shipped work, which turned out to
be the point. Two pieces of interface were designed, prototyped, and thrown
away, and what replaced them was one more question in a conversation that
already existed.

- **What was cut, and why it is worth recording.** The plan was a row of chips
  under the composer saying what the agent can reach (Gmail, Web, Drive) and a
  pinned "routine" token in the message box. Both were prototyped as a
  clickable wireframe first. Looking at it, the founder cut the chips row as
  too much for this version, then the token as extra effort, then asked the
  better question: could we just use plain language? The answer was already in
  our own code. A note written weeks ago explains that every agent is handed
  the same tools, so a permanent "what I can reach" display would tell someone
  whose agent reads documents that it also wants their email. Ambient labels
  state things whether or not they matter. A conversation states them when they
  do.
- **The seam we were actually reaching for.** Every workflow tool opens with a
  trigger step, and Run had no equivalent: setup worked out what an agent was
  for and then stopped, so a routine was always a second conversation you had
  to know how to start. Now the interview's last question is what starts you
  off, asked in the agent's own words, using the same question card everything
  else uses.
- **It only offers what exists.** The two answers are that you ask, or the
  clock does. Watching for a new email or a changed file is not built, so it is
  never offered, and the tool description says so in as many words. During
  testing an agent volunteered the limit itself: "I can't watch for things
  happening in real time, but I can check in on a set schedule."
- **The setup card gained a third section.** "and my routine is", in the same
  voice as "I will be called" and "and my job is", with a dashed edge because
  unlike the other two it is not saved when you confirm. Underneath it says
  plainly that nothing is scheduled yet.
- **The offer waits until after the first run.** You see one real briefing
  first, then the agent offers to make it a routine with the real dates. You
  are agreeing to something you have read rather than to a description of it.
  There is also a mechanical reason: a conversation holds one pending card at a
  time, so the setup card and the routine card cannot share a turn.
- **Two bugs that only live testing would have found.** A weekly rule that
  named no day described itself as "Every week on , at 9:00am", an empty gap
  where the weekday should be. And the new field reached the browser correctly
  but was dropped on arrival, because the chat rebuilds those cards field by
  field. Both fixed.
- **The README now says what an agent can actually do.** Not what it is allowed
  to do: the whole list, as three small tables with a column for whether it
  asks first. Writing it out makes the safety case by itself, because the Gmail
  table has three rows and none of them is send, and the Drive table has five
  and none of them is delete. The journey diagram and the cover image were
  updated too; the cover is now our own screen, in the repo, instead of an
  image hotlinked from someone else's CDN.
- **A speed pass, and one real finding.** Measured on a production build:
  the Routines page paints its first chunk in 18ms and a chat in 21ms against
  a 100ms budget, the timer's due-routines query runs in a tenth of a
  millisecond, and the schedule engine draws a card in under a millisecond for
  every shape. The finding was in the query plan rather than the clock: listing
  a person's routines had no index behind it, which costs nothing today at
  three rows and would have meant every routine anyone creates slowing down
  everyone else's page. Fixed with one index.
- **The timer is live.** The production runner secret is set and the database
  now calls the app every five minutes. Verified end to end: a wrong secret or
  no secret is refused, the correct one returns a clean "nothing was due", and
  the database's own scheduled call reaches the app across the network. From
  here, a routine you set up actually fires on its day without anyone present.
- **Four skills learned something.** Ask whether the agent can say it in the
  conversation before adding any new control, and show a clickable prototype
  before building. A conversation holds one pending card. Option lists are
  promises, so never offer a start the product cannot do. And test agents cost
  runs and hit a per-account cap, so delete them through the app.

## 2026-08-01: Routines, agents that work while you sleep

The biggest feature since the revamp: an agent can now do standing work on a
schedule, and the whole thing was designed in the open first (a lo-fi
prototype iterated eight times against SureThing, Town and Jinba before any
code) and then built in six phases, each merged on its own.

- **What shipped, in one story.** You ask an agent for anything recurring:
  "create a routine that checks tech news every other Wednesday at 8am."
  The agent proposes a routine on a card that shows the schedule in plain
  words, what it will do each time, the cost ("about 2 runs a month"), and
  the next three real run dates computed in your own timezone. You press Set
  it up and it exists. It fires on schedule, reads and reports on its own,
  and its report lands in the agent's own conversation behind a quiet
  divider, exactly where you would look. Anything it wants to send or change
  still waits for you: it says so in its reply and you act in the chat.
- **The schedule is a rule, not a cron string.** Cron cannot say "every 2
  weeks" or "every 10 days", which are exactly the schedules people ask
  for. Run stores a small rule (every N hours, days, weeks or months, on
  which days, at what time, counting from a start date, in a named
  timezone) and one library interprets it everywhere. The timezone math was
  verified against daylight-saving transitions in both directions, months
  without a 31st, and fortnight phase, before anything was built on it.
- **Why the dates are on the card.** During research the same request typed
  into a competitor produced a routine armed for the wrong day, visible in
  two places, discoverable only a week later when nothing arrived. Three
  real dates before you agree is the whole fix, and Run shows them in the
  chat card, the tool's confirmation, and the detail sheet.
- **A Routines page and a sidebar badge.** Routines sits directly under New
  agent, the only row in the rail that can report a state: an amber count
  of what needs you, shown only when it is not zero. The page groups by
  whether it needs you (Needs you, Active, Paused), colour appears only
  where there is something to do, and a row opens a sheet with the next
  three runs, the editable instruction, what it remembers from last time,
  and its recent runs.
- **Runs never collide with your chat.** Every run gets a fresh session and
  never touches the conversation's own live session or its pending
  approvals, so a routine firing while you type cannot race you, and two
  routines on one agent cannot race each other. Each run is recorded (what
  it found, how it ended) and the last report is handed to the next run, so
  "since last time" means something.
- **Failure is designed, not silent.** A failed run says so in the thread in
  plain words and names the next attempt. Three failures in a row pause the
  routine. Running out of your monthly allowance pauses it too, with one
  notice, instead of failing quietly every morning. "Paused by you" and
  "paused by Run" are kept visibly distinct.
- **Run now.** Every routine can be fired by hand from the Routines page,
  which is how one earns trust before its first scheduled morning. Verified
  live: a real web-research briefing landed in the chat nineteen seconds
  after the button.
- **The heartbeat.** A database timer posts to the app every five minutes;
  due routines are claimed one at a time in a way that makes double-firing
  impossible (a crashed run is a skipped run, never a doubled one). Verified
  locally end to end: wrong secret refused, due routine ran once and
  advanced correctly, immediate second tick did nothing.
- **Configure knows.** The agent's panel gained a Routines section listing
  its schedules, and a New routine button that drops "Create a routine
  that " into the composer, ready to finish. The Routines page's empty
  state does the same from its example sentences.
- Merged to `main` via pull requests #212, #213, #214, #215, #216, and #217.
- **Fixed along the way:** a real hydration crash (the card's dates rendered
  in the server's locale first), a routine headline arriving wrapped in
  markdown, and the usage history now labels schedule-fired runs "Routine".
- **Left for the founder:** two five-minute steps to arm the production
  timer (an environment variable on Vercel and a one-statement approval),
  written up in the session handoff. Until then routines run on demand
  everywhere and on schedule locally.
- **Deferred by choice:** waiting approval cards from scheduled runs (the
  schema already carries the columns), a Results feed, unread dots on
  agents, composer connector chips, event triggers ("when an email
  arrives"), and multiple times per routine.

## 2026-07-31 (night): Run becomes a phone app

The founder opened tryrun.today on their Pixel and we went part by part,
pull requests #191 through #197, from a written plan. First the system
itself, recorded in the styleguide before any screen changed: mobile is
below one breakpoint (md, 768px) and only one; every tap target is at
least 44px; input text is 16px on mobile because anything smaller makes
iPhones zoom the page; surfaces run edge to edge with a 16px gutter;
bottom-pinned bars pad the safe area; and nothing may be operable only by
hover, because phones have no hover.

Then the screens. A slim top bar replaced the floating drawer toggle. The
drawer's rows grew to thumb height. The home headline gained a phone size
and stopped orphaning words. The chat went full-screen with its composer
riding the keyboard, its controls at thumb size, and the standard gutter.
The Configure panel and the Usage panel stopped floating like desktop
furniture and became the whole screen. The composer's run ring learned to
open on tap.

Type became a three-tier ladder written into the tokens: the app reads
one step larger on a phone, the chat one step above the app on every
viewport, and the Configure panel one step above even the chat, a
settings screen thumbed at arm's length. All of it is variable overrides
in one file; no component was resized by hand, which is why the whole
pass fit in one night.

Then the founder walked it on their Pixel and the device pass earned its
keep: the drawer became a true full-screen panel with a proper close, the
delete icon found the centre of its row, the headline learned to centre on
the word it is actually showing rather than on a ghost of the longest one,
the chat shed its desktop card chrome so text sits about 20px from each
edge, and the build button became a square arrow at thumb size, the send
affordance every phone already knows (#198 through #201, with the mobile
system, the browser-testing traps, and a styleguide cleanup documented
along the way).

Merged to `main` via pull requests #191 through #201, each deployed to
tryrun.today on merge. The founder's real-device pass is the standing
gate for anything that still feels off under a thumb.

---

## 2026-07-31 (evening): The chat shows its work, and usage grows up

Two threads, both founder-driven loops, pull requests #173 through #189.

The chat now shows its work. The platform's built-in web searches used to
run invisibly: nothing between "Thinking" and the answer. Each search and
page-read now becomes a step carrying its real content ("Searched the web
for ..."), and two or more steps fold into one quiet line reading "5 steps"
that opens on a click. While the agent works, that line shows the step
underway, so the live feedback never disappears; reopening a chat later
finds the block folded. Nothing is invented: every step is an actual call
from the event stream, and the sandbox's internal tools stay unlabeled on
purpose. Verified live on the founder's own briefing agent in production.

Usage went from one meter to a small system, shaped by writing the
jobs-to-be-done down when the design would not settle:

- A small ring in the chat composer's corner fills as the month is spent,
  in the meter's own warning colours. Hovering answers for the chat alone:
  "Total for this chat: 12 runs this month."
- The sidebar meter's one-line tooltip became a proper card: total, bar,
  refill date, a chevron in its title, and the whole card is the button
  into the history. Solid white, always: an alpha hover tint turned the
  card into glass, a lesson now recorded.
- The usage panel opens with "By agent": the month's runs grouped and
  ranked, bars against the biggest spender, aggregated server-side and
  live while the panel is open. The log below keeps the deployment-list
  shape: name leading, date and time trailing, and status speaking only
  for the exception, because "Done" on every row of a history read as
  meaningless. Rows are deliberately flat: linking only the rows whose
  agent still existed made the list feel broken, and the founder ruled
  that a receipt is not a door.
- The composer's controls regrouped at the trailing edge (ring, paperclip,
  send), the attach icon returning to a paperclip by founder call.

The skills learned all of it: the steps recipe, the hover-card recipe with
its opacity trap, exception-only status, all-or-none clickability, the
menu-of-four copy process, and the big one: when copy or layout will not
settle after two rounds, stop and write the jobs-to-be-done; the usage
panel proved it by settling in one move after five rounds of styling.

Merged to `main` via pull requests #173 through #189, each deployed to
tryrun.today on merge.

---

## 2026-07-31 (morning): The real address, and a warmer first impression

Run moved onto its domain. The founder added tryrun.today in Vercel and
repointed two records at GoDaddy; the site now answers there with its
certificate, the www spelling redirects permanently, and the sign-in emails
and redirect rules all point at the new address. The vercel.app address
still works, and local development is untouched.

Then the first-time experience, in a founder-driven loop, pull requests
#153 through #164:

- Creating an agent is now a moment instead of a stuck button. The whole
  home screen breathes out and a shimmering "Building your agent" line takes
  the center, narrating what creation really does, in its true order:
  reading your description, working out what you need done, choosing a name,
  writing its instructions, picking the tools it will need, setting up its
  workspace. The submit deliberately waits three seconds so the sequence
  gets room to play; every line is work that genuinely happens.
- The founder's blank-page report was diagnosed, and the culprit was not the
  setup questions: it was a chat whose agent no longer existed, and the app
  had no screen for that, so it rendered nothing. Now it says "This agent is
  gone" with a button to build a new one. And every agent row in the sidebar
  carries its own quiet Delete with the usual confirmation, so removing an
  agent never depends on any other page working. The founder set the
  principle out loud: the user has a choice at every step, whatever state a
  page is in. It is written into the code as a comment now.
- Copy got warmer everywhere the loop touched: the blocked composer explains
  itself with a hover ("Your 2 agent spots are full") instead of a repeated
  sentence, the placeholder stopped repeating the headline and button, and
  the setup card traded "Quick setup" and its AI sparkles for a checklist
  mark and "A few questions, and you're on your way".
- One layout lesson recorded: elements that fade but keep their space push
  an in-flow sibling below center, so the building state is absolutely
  positioned and was verified centered by measurement, not by eye.

The session closed at the front door: the browser tab now shows the Run
mark instead of the framework's default icon, the sign-in card greets a
returning person ("Your agents are waiting.") and the register card makes
the product's claim ("Build an agent in a sentence."), the submit button
stands taller as the one big action on the page, and beneath both cards
sits a quiet maker's mark: Designed and built by CC Teo. A last wordplay
pass made the two doors a matched pair, each ending on the product's name
as a verb: "Welcome back. Your agents are ready to run." and "Create your
Run account. Describe the job. Watch it run."

Merged to `main` via pull requests #153 through #171, each deployed to
tryrun.today on merge.

---

## 2026-07-30 (late) into 2026-07-31: A full design pass, and then Run went live

This session had two halves: an evening of design and copy work over the
whole surface, and then, because everything kept passing its checks, the
first production deployment.

The design half, merged as pull requests #118 through #146:

- The README lost its structure lecture and its changelog-shaped status
  section; status now describes what stands, in one paragraph and five
  claims.
- The New Agent composer learned to explain itself: the placeholder states
  the screen's contract in one friendly line with a tip in brackets, after
  studying how Clay's Claygent does it and rewriting the job in Run's voice.
- The suggested agent chips were audited against what the tools can actually
  do. One chip promised Drive organizing that no tool could deliver, so the
  agent got three new Drive tools (create a folder, move a file, rename a
  file), all pausing for approval before they touch anything, and the chip
  came back honest.
- Every empty state in the app became the same quiet dashed box, the
  Configure panel gained a drag and drop zone for knowledge files, connector
  status became one small tick beside the app's name with a tooltip, and the
  panel closes with a plain X.
- The home hero got its own sanctioned sizes, a 9px composer radius the
  founder picked by eye, and a subtle staggered fade-in. The chat surface
  reads one pixel larger through a single scoped token override, which also
  taught us that the typography plugin ignores those tokens and needs one
  companion rule.
- The agent's thinking words got a gentle shimmer, tuned down and disabled
  for people who prefer reduced motion.
- Documents written from web research stopped showing raw citation markup;
  the tags are stripped where documents are created and healed on old ones.
- Two engineer-hat sweeps closed the evening: a performance pass over
  everything new (one config route got a third faster by running its
  ownership check beside its reads) and a security pass over guardrails,
  APIs, and row-level security, whose findings became a reusable
  security-audit skill (#146).

The deployment half, pull requests #147 through #151 plus dashboard work:

- Citation markup turned out to leak into chat replies too, not just
  documents; replies are now cleaned when saved and when rendered (#147).
- The founder connected the GitHub repo to Vercel, moved the server to
  Singapore beside the database, set the environment variables, and pointed
  Supabase's sign-in URLs at the live address. Signed in on the production
  URL, chatted with a real agent, watched the meter count the run.
- The database lockdown migration was finally applied, and applying it
  taught a real lesson: revoking access from the anonymous role does nothing
  while the default grant to everyone still stands. A follow-up migration
  (#148) revoked the default and granted back only signed-in users, verified
  by probing, not by reading the file. Avatar listing is now scoped to each
  person's own folder.
- Leaked-password checking turned out to be locked to Supabase's paid plan,
  recorded honestly instead of left as a pending click (#149). In its place,
  every password field gained a show and hide eye toggle and new passwords
  need eight characters, enforced in the form, in the server, and in the
  database's own settings (#150).
- The session closed with the first production speed assessment (#151): the
  standing performance gate can now aim at any deployed URL, and the live
  site passes every budget from the real internet. Pages paint in under a
  tenth of a second signed in, navigation is prefetched and instant, and the
  one slower number (data streaming in at 220 to 420ms) is the database
  plan's per-request floor, recorded as the boundary rather than chased in
  code.

Merged to `main` via pull requests #118 through #151. Not done, by choice:
the founder's domain (ten minutes whenever wanted), SMTP, Google's app
verification for new Gmail and Drive connections, and the plan upgrade.

---

## 2026-07-30 (evening): Decisions enforced, and a gate that watches speed

The two allowance questions stopped being open. The founder decided the free
plan really is 200 runs a month, and that using the last one stops the next
run. The meter's number is now enforced where turns begin: a new message past
the limit gets a plain refusal with the refill date, while approvals and
answers still complete, because stranding a half-finished conversation would
be worse than one extra run. Proven by lowering the limit below the dev
account's usage and watching the refusal fire; no real run was burned testing
it. The check costs no time, riding a batch of reads the route already made.

Performance testing became standing machinery instead of something the
founder has to request. A script measures what needs no sign-in (public page
speed, the signed-out redirect map, bundle weight) against budgets set from
measured baselines, and the phase-end checklist runs it every time. The
founder signed in themselves on a production build while the agent timed it:
every page paints in under 30ms, clicking between pages costs zero network,
and the sign-in button's waiting spinner was confirmed by eye.

The front page also joined the rest of the app behind the sign-in gate: a
signed-out visit used to be served the entire app shell and then bounced,
a flash of an empty app; now it is one redirect in a few milliseconds.

Merged to `main` via pull requests #110 through #114.

---

## 2026-07-30 (later): A way back in

Forgetting your password used to be permanent: the login page had no reset
link and there was nothing behind one. Now there is the standard way back in.
A Forgot password link on the login page leads to a one-field page that sends
a reset email, the emailed link signs you in through a verify step, and you
set a new password. The message after requesting a link is the same whether
the email has an account or not, so the form cannot be used to find out who
has one. The verify step accepts both link formats Supabase can send, because
which one arrives depends on dashboard settings, and coding for only one is
the classic way this flow breaks. An expired or reused link lands on the login
page with a plain sentence, never an error code.

Settings gained a Password section that uses the same machinery, and the
sign-in pages stay as fast as they were: server rendered, no new JavaScript,
6 to 13ms on a production build.

Not yet done, recorded as a deploy-day task: production email needs an SMTP
provider connected to Supabase (the built-in dev mailer sends a handful per
hour), and the reset link's landing URL must be added to Supabase's redirect
allowlist for the production domain. The founder verifies the full email round
trip with their own account, since the agent does not handle passwords.

Merged to `main` via pull request #111.

---

## 2026-07-30 (closing): Making sure nothing leaks

The founder saw the env example file on GitHub and asked the right question.
The audit answer: that file holds only the word placeholder eleven times, the
real env file has never been tracked, and a scan of every commit ever made
(157 of them) found no key, no token, no password, and no project identifier,
anywhere, ever. The one file that looks like it contains key patterns is the
app's own secret detector, which holds the shapes of keys so it can warn
people, never keys themselves.

Then the one-time audit became standing protection. GitHub secret scanning
and push protection are switched on, so a push containing a known key shape
is rejected at the server no matter whose machine it comes from. A pre-commit
hook now blocks real env files and anything shaped like a credential before
it can even be committed, proven by staging a fake key and watching it bounce.
Project-specific strings the hook watches for live in a git-ignored file,
because a public hook must not name the secrets it blocks; the first draft
embedded one in its own pattern and was caught before commit, which is
exactly the mistake the layers now exist to catch.

Merged to `main` via pull request #108.

---

## 2026-07-30 (with the late hours of 07-29): Faster everywhere, consistent everywhere, shorter everywhere

Nineteen pull requests, #88 through #106, in three arcs: a deeper speed pass,
a design consistency pass, and a writing pass that ended with a style the
founder wants kept.

**The second speed pass (#89, #102)**

The Settings page felt slow, and the reasons turned out to sit in front of
every page, not just that one.

- Checking who you are was a network call to the auth server on every page and
  every API request, measured at 123 to 651ms. It is now verified locally
  against the project's signing key in about 12ms. The proxy had already been
  fixed this way in the previous pass; two other callers had been missed.
- The dashboard layout used to wait for all of its data before sending a
  single byte, which also blocked every page's loading skeleton. The sidebar
  is now a shell that paints immediately with three slots that stream in.
  Measured on a production build, first paint went from 319ms of blank page to
  about 30ms on every route.
- Knowledge and Connectors are prefetched, so clicking them costs no network
  at all: 846ms and about 2s down to 20ms and 14ms. Chat links are deliberately
  not prefetched, because a cached chat would freeze its message list and a
  reply could seem to vanish.
- Opening a chat folded its messages into the thread query, one round trip
  instead of two in series, on the most-walked path in the app.
- Signing in was audited too. The password check itself costs 264 to 491ms at
  the auth server and is deliberately slow, so the fix was feel: the button now
  answers the press instantly with a spinner and cannot be pressed twice, the
  fields carry autocomplete hints so password managers fill them at once, and
  the email field takes focus on arrival.
- Honest finding recorded for later: every request to Supabase carries a flat
  ~120ms floor even for a no-op, proven by timing a health check against a
  one-row read. That is likely the plan tier, not code, and checking it costs
  no engineering time.
- Also dropped two duplicate indexes on the usage table (migration 032) that
  were maintained on every insert and served no read.

**The consistency pass (#90 through #101)**

The founder put three screenshots side by side and asked why only the chat
page felt right. The answer was that only the chat page had a column.

- One PageShell now wraps Settings, Knowledge and Connectors and their loading
  skeletons: the same centered width the chat column uses. Four different
  page widths became one, and the stray inner caps went with them.
- The Connectors page now tells the whole truth about what an agent runs on: a
  Claude row (official icon, "Always on", "Built in") joined Gmail and Drive,
  and web search moved onto that row because that is where it actually comes
  from. Connected states sit beside the app name with a small green check,
  icon tiles grew to match the two text lines beside them, and Connect and
  Disconnect explain themselves on hover in one line each.
- The usage meter also explains itself on hover ("See this month's runs"), and
  a brand-new user's empty sidebar now keeps the Agents heading with one quiet
  dashed slot, "Your agents will live here", instead of going blank.
- The words got shorter everywhere the founder pointed: both page subtitles cut
  to one line each ("What your agents always know." / "What your agents can
  use."), the Knowledge empty state boxed, its headline stepped down a level,
  and every tooltip and footnote rewritten until it read like a person.

**The writing pass (#104, #105, #106)**

The README opening was rewritten in Paul Graham's style and the founder loved
it outright, the first copy this project produced that came back without a
revision round. The shape is now recorded in the write-copy skill as the north
star for all Run copy: the headline is a claim, one idea per sentence, a
concrete example early, and the best line saved for last as a turn
("Describing what you want is the setup"). The three "What makes it different"
bullets were reshaped the same way, and that section doubles as future landing
page copy.

**Skills taught what the sessions learned (#88)**

Two new skills (write-copy, usage-accounting) and three updated ones
(chat-tools, build-ui, phase-gate) now carry this week's hard-won rules:
cache tokens are the cost, realtime needs setAuth before subscribe, a session
waiting on a tool call rejects a plain user message, never run prettier, and
a line that fails two rewrites should be deleted rather than polished.

Merged to `main` via pull requests #88 through #106.

---

## 2026-07-29 (later): Asking before it starts, and failing in plain English

Two pieces of the conversation itself, both prompted by watching it work rather
than by a plan.

**A checkpoint before an agent begins**

- Setting up an agent used to end with the interview and the agent immediately
  beginning its first task. The name had been chosen for the person and never
  shown, and their answers were written into the instructions without them
  reading a word. If either was wrong, they found out after it had acted. This
  was the one place the product did not ask first, which is the promise it makes
  everywhere else.
- The agent now proposes its own name and job, in its own words, and waits. Both
  are editable in place.
- Agreeing is not the only way out, which turned out to be the important part.
  Editing a field fixes a clumsy word; it does not fix being misunderstood, and
  asking someone to rewrite the brief by hand is exactly the work they came here
  to avoid. So the composer stays open, and telling the agent what to change
  makes it revise and show the card again.
- Two things only running it could teach. A plain message is refused while the
  session is waiting on a tool call, so a typed correction has to answer that
  call first. And handing the correction to the model as a tool result makes it
  reply as though it had looked something up, so the person's words have to
  reach it as a message.
- The card names a connected account only when the person named it first. Every
  agent is currently handed both Gmail and Drive, so listing what one could
  touch would tell someone whose agent reads documents that it also wants their
  email.

**Failures written for people**

- Every error reached the screen as whatever string an exception carried. In one
  week that included a JavaScript variable name and a raw Anthropic payload,
  printed in red. Neither says what happened, whose fault it was, or what to do,
  and both were dead ends.
- Mapped every failure the chat can hit, from our own bugs to a busy model, an
  expired connection, a message too long to send, a dropped network, and a turn
  that outran its time. One translation layer now stands between an exception
  and the screen, so the wording cannot drift apart across six routes.
- Trying again repeats the same turn without anyone retyping, and does not leave
  a second copy of the message in the conversation. Once it works, the failure
  disappears rather than staying in the history.
- A reference appears only when the fault is ours, so someone has something to
  quote and we have something to search for.
- Auditing the whole surface rather than the streaming path found three more: a
  page that crashed had nothing catching it at all and showed a blank screen, an
  expired session said "Unauthorized", and a workspace that was not ready called
  itself a runtime.
- The one path that deliberately stays different: a tool failure goes to the
  agent, so it can explain in its own words or try another way. That made it the
  only route a raw payload could still reach a person, by being quoted back at
  them, so it is stripped of anything machine shaped first.

**The principle underneath both**

- Design the failure before the success. In an agent product the failures are
  not edge cases: models are non-deterministic, tools are other people's APIs,
  and turns run for minutes. The failure path is the product, most days.

---

## 2026-07-29: Counting what a conversation actually costs

Backend and data work only. Nothing changed on screen.

**The problem found**

- The app has recorded usage since early on, and 129 real rows existed. They
  were wrong. Between them, 118 recorded conversation turns claimed 990 input
  tokens, about three per turn, which is impossible.
- The cause: a conversation reuses most of its prompt, and the model reports
  the reused part in separate fields we were ignoring. We counted only the
  small leftover. Estimated cost was therefore understating a typical turn by
  roughly 79 percent.
- Two further gaps came out of tracing it. A turn that failed halfway recorded
  nothing at all, so every failure quietly lost the money it had already spent.
  And naming a new agent, which is a real model call, was never recorded.

**What was built**

- Usage rows now store the reused prompt counts as well, and price them
  properly: reading back a cached prompt costs a tenth of the normal rate, and
  saving one costs a quarter more. Checked the arithmetic on a typical turn:
  2.48 cents where the old code said 0.53.
- Pinned model versions are now priced as the model they are, instead of
  falling through to a default that overcharged the small fast model threefold.
- Every turn now writes its row whether it finished or fell over, and a failed
  run is marked as such. Failures are not counted against a person's monthly
  allowance, because charging someone for our own failure is a way to lose
  them, but what they cost us is still recorded honestly.
- Each run now records the name of the agent that did it, copied at the time.
  Agents are deleted for real, so without this a deleted agent silently erased
  itself from the whole history. Verified against the live database: after
  deleting the agent, the history row keeps the name.
- Each run also records which conversation it belongs to, so a history entry
  can be clicked through to the work itself, and what started it: a person, a
  schedule, or the app acting on their behalf. Scheduled runs do not exist yet,
  but the column does, so their history will be right from the first one.
- A monthly rollup, one row per person per month, so a usage meter is a single
  cheap read rather than a scan. It respects the same permissions as the raw
  table: verified that a person sees only their own months and a stranger sees
  nothing.
- The plan seam that already governs how many agents you can have now also
  carries a monthly run allowance, and can answer "how much is left and when
  does it come back". Not enforced anywhere yet; that is a product decision,
  not a plumbing one.
- A reader for the history list itself, newest first, paged by time rather than
  position so a growing list does not skip entries.

**Then the part people can see**

- Confirmed the recording on a real conversation before building anything on
  top of it. One ordinary question recorded 10 tokens of fresh prompt and 7,203
  tokens of reused prompt. The old code would have counted only the 10, which
  is the whole bug in one line.
- A meter sits beside your account: how many runs you have used this month,
  a quiet bar, and the date you get more. It counts runs rather than tokens,
  because a token is our unit of cost and means nothing to someone deciding
  whether they can finish their work.
- Clicking it opens the history: every run, which agent did it, and when.
  A run whose agent has since been deleted still names what it was.
- Making it update by itself surfaced a quiet failure worth writing down. The
  live connection carries its own credentials and does not inherit the ones the
  rest of the app uses, so it connected as nobody, subscribed successfully, and
  then received nothing at all, which looks exactly like an account with no
  activity. It now signs in before it listens, and says so when it cannot.

**Then made it cheap**

- The meter is drawn on the server, because it is always on screen and fetching
  it in the browser would trade a spinner for nothing. But it was asking the
  question in a way no index can answer, so every page view read everything the
  person had ever done and got slower for the rest of their life. Asked as a
  date range instead, it comes off the index.
- The history is fetched only when the panel is opened. Most visits never open
  it, and carrying it on every page load would cost everyone for a few.
- The live connection now exists only while that panel is open. Held open all
  session it would spend a connection per tab, permanently, on a number that
  changes a few times an hour and that nobody is looking at. Measured: none
  open while the app sits idle, one while the panel is open, released on close.
  The meter itself updates when a conversation finishes, which is also more
  honest, since the server knows a run that failed or stopped to ask you
  something does not count.

**Decisions**

- A run is one unit, not a weighted credit. A reference design we looked at
  bills fractional credits, which is fairer between a quick question and a long
  research job, but it makes the number unpredictable: you cannot tell what
  your next run will cost until it is over. This product hides the machinery
  everywhere else, so the meter counts runs and keeps cost internal.
- Usage is shown as a plan meter beside the account rather than as a dashboard
  page. The shell is deliberately flat and a separate analytics page would
  fight it.
- A run that fails is recorded and costed but not charged to the person.
  Charging someone for our own failure is a way to lose them.

**Known limits**

- 113 of the 129 existing rows show no agent name. Their agents were deleted
  before the column existed and there is nothing left to recover. New rows are
  fine.
- Rows written before this session undercount input and cannot be repaired.
- The monthly rollup buckets by UTC, which will read slightly off for someone
  far from that timezone near a month boundary.

---

## 2026-07-28 (later): An end-to-end performance pass

Six pull requests, all about speed, driven by an audit of what actually blocks
a page from appearing.

**What the audit found**

- Every one of the seventeen routes was dynamic and not one had a loading file.
  Next only prefetches a dynamic route when a loading file exists, so clicking
  an agent in the sidebar was a dead click: nothing moved until the whole
  server chain finished.
- Authentication ran three times per page load. The proxy checked the session,
  then the layout asked again, then the page asked a third time, and the
  helper was not memoised, so each was a fresh network call to the auth server
  plus a repeated profile query.
- That proxy check ran on every request, including API calls it never gated.
- The chat page made about eight database round trips one after another, and
  half of them were for a configure panel that starts closed and that most
  visits never open.

**What shipped**

- **Loading skeletons on every dashboard route** (#72). Each is shaped like the
  page it stands in for, so content replaces it in place. This is what turns a
  dead click into an instant transition.
- **The session lookup is memoised for one request** (#74). One auth round trip
  and one query removed from every page load.
- **The session is now verified locally** (#75). The proxy checks the token
  against the project's published signing key instead of asking the auth
  server. Measured in the log, this went from 207 to 765 milliseconds per
  request down to 3 to 6. API routes were also removed from the proxy, since
  each one already authenticates itself, which matters most for chat where the
  check was firing on every message.
- **Dead redirects removed** (#76). Two rules pointed at routes deleted with
  the old schema, so they only ever forwarded a bookmark to a missing page.
- **The chat page's query chain collapsed** (#77). Reads that did not depend on
  each other now run together, and the thread is read rather than written and
  read back.
- **The configure panel loads when it opens** (#78). Four queries left the
  critical path. This also fixed a real bug: the panel used to show whatever
  was true when the page loaded, so connecting an app in another tab left it
  stale until a full reload.

**What we deliberately did not do**

- **Static sign-in and register pages.** The plan was to move the one
  request-dependent bit behind a boundary. Built it, and the page stayed
  dynamic. Making it static needs cache components enabled across the whole
  app, which fails the build today because dashboard pages read live data
  outside a boundary. That is a real project, not housekeeping, so it was
  reverted rather than left as indirection that implies a benefit it does not
  deliver.
- **Dropping the monospace font.** The audit called it unused. It is not: it
  renders code blocks in chat. Dropping it is still possible but it changes how
  code looks, so it is a design decision rather than a free win.
- **Moving the shadcn package to development dependencies.** It is not only a
  command line tool; the stylesheet imports from it at build time.

**How it was verified**

- The signed-out route matrix passes, and a token with a valid looking header
  but a forged signature is rejected, so local verification genuinely verifies
  rather than merely decodes.
- A real chat turn ran end to end with no proxy check in front of it.
- A non-owner cannot reach the new panel endpoint, checked directly against the
  database as a second user.
- The loading skeletons were confirmed with a temporary server delay and a page
  probe, because screenshots kept racing the transition and made a working
  feature look broken.

**Honest limits**

The proxy numbers are measured. The chat page improvements are structural, a
shorter chain of dependent queries, and are not quoted as a benchmark: local
development timings are too noisy to support a figure. A real number needs
measuring against production infrastructure.

---

## 2026-07-28: Knowledge everywhere, connectors, and a shell redesign

Sixteen pull requests. One real feature, two structural moves, and a long
redesign session driven by the founder looking at the screen and saying what
was wrong.

**Features**

- **A knowledge source can now apply to every agent you own.** A library only
  pays off if you write something once. Until now a source reached an agent
  only by being attached to it by hand, which is right for a product spec one
  agent needs and wrong for a voice guide or a glossary. Mark a source "use
  with every agent" on the Knowledge page and it reaches every agent you have,
  including ones made later, and editing it once updates all of them. Verified
  end to end rather than in the database alone: an agent created before the
  source existed, never attached to it, signed off exactly as the source
  instructed. Turning the switch on checks every agent's budget first and names
  the agents with no room, and the per-agent meter now counts always-on sources
  so an agent cannot quietly exceed the cap the meter claims to enforce. Merged
  via #54.
- **Connectors have their own page.** A connector is account level: link Gmail
  once and every agent you own can use it. The only way to reach one, though,
  was from inside an agent, which put an account-level setting behind an
  agent-level door and made connectors unreachable before you had made your
  first agent. They now sit in the nav next to Knowledge. Connecting from
  inside an agent still works, and all three surfaces render the same row
  against the same endpoints so their state cannot drift. Renamed from
  Connections to Connectors, matching the tools people already use. Merged via
  #52.
- **The account moved behind the avatar.** The sidebar footer mixed two
  unrelated things: Knowledge and Connectors, which belong to the agents, and
  Settings and Sign out, which belong to the person. Clicking your own face now
  opens a menu with Settings and Sign out, and the route moved from /dashboard
  to /settings, which is what the page has been for a while. Merged via #53.
- **The composer grows as you type.** It was one line tall whatever you wrote,
  so a long message scrolled inside a slot too small to read it back in. It now
  grows with the text and shrinks again as text is removed, including after a
  send clears it. Its existing cap still holds, so a very long message stops
  growing and scrolls rather than pushing the conversation off screen. Merged
  via #64.

**The shell redesign**

- **The sidenav is structure, not a card.** It was a white rounded panel with
  its own border and shadow, floating beside a second card holding the content.
  Two stacked surfaces competed for the same reading. The nav now shows the
  canvas straight through, flush to the edge and full height. Merged via #55.
- **Configure docks beside the conversation.** It used to be an overlay with a
  scrim, which is right for a decision you make and dismiss. This is not that:
  you open it because of something the agent just said, and dimming that reply
  hides the evidence you are acting on. It is now its own card that slides in
  while the conversation shrinks to make room, giving the app three columns.
  The risk worth testing was the chat's stick-to-bottom behaviour fighting a
  width change, so it was checked live: streamed a reply with the panel open,
  closed the panel as a turn completed, and toggled repeatedly. The scroll
  anchor held every time. Below a large screen the panel floats instead, since
  pushing on a narrow screen leaves a column too thin to read. Merged via #57.
- **The composer action row was rebuilt.** Attach and send now sit together at
  the trailing edge rather than at opposite corners, since they act on the same
  thing. The paperclip became a plus, because a paperclip reads as "document"
  when the input also takes images. Both carry a tooltip, as does the configure
  control, because a plus, an arrow and a square say nothing on their own. The
  jump-to-latest pill became a compact square, which also retired a known bug:
  the pill was wide enough to cover the last line of the message it was
  pointing you away from. Merged via #56, #58 and #60.
- **One card treatment everywhere.** The shell cards moved to an 8px corner,
  added as a named token rather than a raw value so the exception stays
  countable, and every card that sits in the page flow lost its shadow. Shadow
  now means one thing only: this floats above the page. The conversation column
  was also narrowed by a fifth, which widens the space either side of the text.
  Merged via #59, #61, #62, #63, #65 and #66.
- **The home screen got some life.** A very slow wash of colour behind the
  prompt box, built from the palette's own deep forest green and warm paper at
  single-digit alpha rather than invented colour, and the headline now reads
  "Build an agent for your inbox" with the last word cycling through drafts,
  writing and research. Both are pure CSS animating only transform, opacity and
  filter, so no motion library was added for either. Both stop under reduced
  motion, and the headline's animated copy is hidden from screen readers, which
  get the sentence once as a fixed string. Merged via #67, #68 and #69.

**What broke, and what it taught**

- **The same specificity bug twice.** Two attempts to remove the content card's
  shadow and set its corner radius silently did nothing on every page except
  chat. The sidebar component sets both with a compound selector that outranks
  a plain attribute selector, so the overrides never applied; chat only looked
  right because it sets the classes directly on its own cards. Both were fixed
  at the source rather than by escalating the override, since a specificity
  ladder built to cancel a class is worse to own than the class. The lesson was
  really about verification: the change was checked on the one page that was
  immune to the bug. Merged via #65 and #66.
- **A phantom bug that was a zombie server.** A knowledge toggle appeared to
  work in one direction and not the other for a long stretch. The cause was an
  old dev server still holding port 3000 and serving stale code alongside a
  second one on another port. Once killed, both directions worked first try.
- **A tooltip that measured itself out of existence.** The first version of the
  truncation tooltip swapped the measured element for a tooltip trigger once it
  detected clipping, which threw away the ref and made it measure false again.
  Fixed by keeping the trigger mounted and making only the content conditional.
- **A backdrop nobody could see.** The ambient wash was placed behind the
  content card's own background rather than on top of it, so the first version
  was invisible.
- **The column went the wrong way first.** A request to widen the space either
  side of the chat text was read as widening the text, so the column was made
  wider before being corrected to narrower. Merged via #61 then #62.

**Also**

- The configure panel no longer offers edits a non-owner cannot make. The
  server already scoped every one of those writes to the owner, so the actions
  quietly did nothing; the affordances were lying. Merged via #51.
- `docs/styleguide.md` was updated in the same pull requests as the changes it
  describes, so it no longer prescribes shadows and radii that no longer exist.

## 2026-07-27: Knowledge base, self-serve setup, and a big clear-out

Five pull requests. Agents can now be taught things, anyone can get started
without an administrator, the schema left over from the old company product is
gone, and how many agents you can create is set by a plan rather than by a role.

- **Agents can be given knowledge.** You can add a note or upload a file (PDF,
  Word, text, Markdown, CSV) that an agent always knows: how you write, the
  facts you repeat, the words your team uses. A source belongs to you, not to
  one agent, so one voice guide can feed several agents, and a new Knowledge
  page lists everything you have with the agents using each one. Verified the
  honest way: a note added mid-conversation changed the very next reply, which
  opened with the right greeting, kept to three paragraphs, used no exclamation
  marks, and signed off exactly as the note asked. Merged via #44.
- **Guardrails, because knowledge is carried into every message.** Each source
  is capped, each agent has a knowledge budget shown as a meter, and anything
  that looks like a password or API key asks for one deliberate confirmation
  before it is saved. Uploaded text is treated as reference material, never as
  instructions, and the security rules are still the last thing an agent reads.
- **Fixed a defect the knowledge work exposed.** Editing an agent changed
  nothing in a conversation already open, because a running session keeps the
  settings it started with. So adding a voice guide appeared to do nothing at
  all, which is the worst way for a feature to fail. Saving now refreshes the
  conversation for everyone using that agent, and the confirmation says the
  next message will use it.
- **Anyone can start without an administrator.** A new user's first message used
  to fail with "the agent runtime is not set up yet, ask an admin". The runtime
  now sets itself up the first time it is needed, and the administrator page,
  its API, and the permission helpers that guarded it are gone. The sidebar
  shows your account instead of an "Administrator" or "Member" rank. Merged via
  #45.
- **Cleared out the old company product.** Run began as a company tool where an
  admin created agents and assigned them to staff. That model is gone, so the
  tables, columns, policies, and helpers behind it were removed. The clear-out
  found two things still quietly attached, including one that would have blocked
  starting a chat, both caught deliberately rather than by accident. Merged via
  #47 and #49.
- **Limits instead of ranks.** How many agents you can create is now a number on
  a plan, checked on the server before anything is created, with the box on the
  home page explaining itself when you reach it. A role is a wall rebuilt for
  every feature; a limit is a dial. Merged via #48.
- **Three bugs found by testing the paths the first pass skipped.** Someone
  viewing an agent they do not own could half-add knowledge to it, leaving a
  stray source behind and an error that retrying could never fix. Refreshing an
  agent's settings reached only the owner's own conversation. A failed upload
  could strand a file in the library. All three are fixed.

## 2026-07-26: Dogfood session, the core is validated, plus chat polish and fixes

The big one. The founder connected their real Gmail and Drive and ran the whole
loop for real, and it works. Alongside that, a run of chat-surface improvements
and two real bug fixes, shipped one pull request at a time and verified live.

- **The core is validated on real data.** The founder used it on their own inbox
  and files: it summarized and critiqued a real Drive document (specific and
  grounded in the actual content), drafted email replies that follow
  instructions, turned emails into a downloadable document, and drafted a reply
  that the founder approved through the in-chat gate and actually sent to a real
  person. The output is good enough to use, and the ask-before-writing trust
  model works end to end. This is the question the whole project rested on, and
  the answer is yes. Validated by the founder, one expert user; the next proof is
  other real users on their own accounts.
- **Agents can hand back downloadable documents.** A new create_document ability:
  the agent produces a titled Markdown file that appears in the chat as a card
  with a preview and a Download button. It has no outside effect, so it runs
  without an approval prompt. Merged to main via pull request #36.
- **Closed the loop after an in-chat connection.** Connecting Gmail or Drive
  mid-chat used to dead-end (nothing continued, the panel looked stale). Now the
  agent resumes the task on its own, the connect card shows waiting and connected
  states, the panel refreshes, and there are clear toasts. Merged via #34.
- **The chat reads like a real product now.** The header and composer stay pinned
  while only the messages scroll, with a jump-to-latest pill (#37). Activity lines
  name the exact step ("Searching your inbox from the last 2 days") (#35) and now
  flip to past tense once done ("Searched your inbox") (#39). Messages carry day
  dividers and a hover-reveal time (#41). The Configure panel is regrouped into
  Profile, Behavior, and Connections instead of a flat list (#40).
- **You can delete an agent yourself.** A confirm-gated delete in the Configure
  panel removes the agent and its chat history and cleans up the remote agent, so
  there is no more manual cleanup. Merged via #38.
- **Fixed a chat-breaking error.** A session could get stuck waiting on unresolved
  tool calls, after which every new message returned a raw error. The run loop now
  clears that state and resends automatically, so the chat self-heals. Merged via
  #39.
- **The README is now a real product overview** with the end-to-end journey, the
  app structure, the agent model, trust and safety, and two diagrams, so anyone
  can understand what Run is from the repo. Merged via #42. Pull request #33
  earlier refreshed the internal build skills.

Ten pull requests merged to main this session, #33 through #42, each verified
live by the founder.

## 2026-07-26: Refresh the internal skill set after the revamp

A short maintenance session with no product code change. The repo carries a set
of internal skills (repeatable playbooks for building and verifying Run). Several
predated the prompt-first revamp and still referenced the old missions product,
so we audited them against the live codebase and fixed the stale ones.

- **Audit against reality, not memory.** Checked every skill claim against the
  actual routes, files, and docs. Two skills that looked stale turned out to have
  already been updated in an earlier session; the audit had first trusted an
  outdated snapshot, so re-reading the files on disk before editing is what
  caught it.
- **Fixed the phase-gate skill.** Its scope check now reads the current revamp
  plan and happy-path journey instead of the superseded roadmap, and its
  route-protection check now hits the real routes (home, dashboard, admin
  integrations, login, register) instead of the removed missions and admin pages,
  so the gate no longer reports false failures.
- **Fixed the build-ui skill.** Its overlay-form example pointed at two deleted
  components; it now cites the live config panel, which uses the same pattern.
- **Added a new skill for prompt composition.** The one load-bearing contract
  with no playbook: how an agent's system prompt is assembled from the user's
  instructions plus a generated policy region (voice, security, and the stay-on-
  task boundary) under a sentinel, and how the editable instructions are
  recovered from it. Every place that writes an agent's prompt must go through
  the composer, or the safety floor silently disappears. The new skill records
  that invariant and the exact enforced sites, all verified in the code.

Shipped to `main` via pull request #33.

## 2026-07-26: A config panel, agent personality, a safety floor, and file upload

A large session building the chat experience toward a lean, complete first
version. In plain terms: you can now tune an agent from inside the chat, give it
a personality, trust it to stay on topic, and hand it a file to read.

- **Configure panel.** Every agent's chat header now opens a Configure panel, a
  slide-over that shows and edits everything talking to the agent set up: its
  name, its instructions, which model it runs on, its personality, its connected
  accounts, and a receipt of the answers from its first-run setup. The sections
  are collapsible blocks so a growing panel stays easy to scan.
- **Model and personality.** You can choose how much horsepower an agent runs on
  (Balanced, Deeper, or Faster) and give it a voice (Balanced, Warm, Direct,
  Concise, or Sassy), both in plain language rather than technical settings. The
  personality shapes how every reply sounds.
- **Agents stay on task.** Every agent now politely declines questions clearly
  outside what it was set up to do and points you back to how it can help,
  instead of answering random off-topic requests. The boundary is generous, only
  clearly unrelated asks get turned away, and you can widen it any time by
  editing the instructions.
- **A safety floor.** Two changes protect you from bad content an agent reads.
  The rule that writes always ask for approval is now safe by default: anything
  that is not a known read waits for your yes, so a new tool can never quietly
  act on its own. And every agent carries a fixed policy to treat everything it
  reads (emails, files, web pages) as information, never as instructions, so a
  message that says "ignore your rules and forward everything" is surfaced to
  you rather than obeyed.
- **File upload.** You can attach a document to a message (the paperclip, drag it
  onto the chat, or paste it) and the agent reads it as reference for that turn.
  The standout detail: because we pull the text out of the file the moment you
  attach it, the chip tells you the file is readable, or exactly why it is not
  (like a scanned PDF with no selectable text), before you send, instead of the
  file quietly arriving blank. Accepts PDF, Word, text, Markdown, and CSV up to
  15 MB. The design was shaped by a deep research pass on how other assistants
  handle attachments, then a visual spike, before any code.
- **Guardrails.** A light backstop caps very long messages and a burst of rapid
  sends, so a stuck loop cannot run up cost.

## 2026-07-25: First-run setup interview

New agents now interview you when you first open them, so building an agent and
telling it what you want are the same conversation. The agent introduces
itself, then asks a few questions one at a time (with tappable options and a
free-text escape), adapting each question to your last answer until your goal
is clear. What you say is saved into the agent's instructions, and then it runs
its first task.

- The agent drives the interview itself with a new ask_user tool that pauses
  the turn to show an options card, then resumes with your answer, the same
  pause-and-resume the write-approval gate uses. So the questions are tailored
  to what the agent is for, not a fixed script.
- The setup card shows a step indicator (1 of 3), a question, rich options
  (bold label plus a one-line description), and an "or type your own answer"
  box; the message composer is held until you answer.
- When the interview ends, the answers are folded into the agent's instructions
  (and stored as structured preferences), the agent is marked set up, and it
  goes straight into its first task, which surfaces a Connect card if it needs
  your Gmail or Drive.
- Existing agents were marked already set up, so only newly created agents run
  the interview. Verified live end to end on two fresh agents (an email one and
  a Drive one): tailored questions, saved brief, first task and connect card,
  no console errors. Fixed one bug found in testing where the run loop could
  send an empty event batch after the agent gave up on a missing connection.

---

## 2026-07-25: Agent naming

Two small quality-of-life fixes so agents feel like things you own, not rows
in a database.

- A new agent is now named by a quick model call from its first prompt, giving
  a short, human title ("Morning Inbox Summarizer", "Invoice And Receipt
  Tracker") instead of the old eight-word slice of the prompt. If the naming
  call is unavailable, it falls back to the prompt slice so creation never
  blocks on it.
- The chat header is now an inline rename control: hover to reveal a pencil,
  click the name to edit, Enter or blur to save, Escape to cancel. The name
  saves optimistically and reverts if the save fails, and updates everywhere at
  once (header, sidebar, greeting, composer). The Anthropic console name is
  synced best-effort so a version conflict never blocks the rename you see.
- Verified live: renamed a demo agent and watched every surface update, with no
  console errors. Lint, typecheck, and a production build all pass.

---

## 2026-07-25: Phase 5, removing the old UX

With the prompt-first shell proven, we deleted the screens the new direction
replaced so the codebase reflects one product, not two.

- Deleted the old user-facing UX: the Runs board and run detail, the agents
  list, the guided agent wizard and agent detail, the admin company-context
  and user-management pages, and the unlinked usage page.
- Deleted the components and API routes behind them (missions, old agent CRUD
  and knowledge/sharing/test, squad, company settings, org-level Drive), plus
  the now-orphaned library files. Fifty files removed in all.
- Repointed the post-login, post-register, non-admin, and already-signed-in
  redirects from the deleted /runs to the prompt-first home.
- Trimmed the admin Connections page to the one thing still needed there, the
  shared agent runtime setup; members connect their own Gmail and Drive from
  inside a chat. Refreshed a little leftover "missions" wording to match the
  new vocabulary.
- The missions database table is intentionally left in place; dropping it is a
  separate data decision, not part of this UX cleanup. Lint, typecheck, and a
  production build all pass.

---

## 2026-07-25: The revamp, a prompt-first personal agent builder

A deliberate pause and reset of the product's shape. After the guided
wizard and Runs work, we stepped back and rebuilt the experience around a
single idea: Run is a simple AI agent builder you talk to. Direction
validated by a deep-research sweep of the mid-2026 agent-builder market
(prompt-first won, the visual canvas approach failed at OpenAI, proactive
runs and human approval on writes are now table stakes) and by reference
screens from Jinba, Superagent, SureThing, and AirOps.

- Phase 1, the prompt-first shell: the home is one prompt box ("What do you
  want to create today?") with example chips; submitting creates an agent
  and opens its chat. The sidebar became the list of your agents, each an
  ongoing chat thread. New threads and messages tables. Merged via PR #11.
- Phase 2, the live chat loop: each agent is something you talk to, with a
  thinking shimmer, token-by-token streaming, and a Send/Stop composer,
  built on a custom chat UI (react-markdown, use-stick-to-bottom) driven by
  our own streamed events from a Managed Agents session per thread. Multi
  turn memory works because the session persists. Merged via PR #12.
- Phase 3a, per-user connections and read tools: each person connects their
  own Gmail and Drive; when an agent needs a connection it hasn't got, an
  inline connect card appears in the thread. Four read tools (search inbox,
  read email, list and read Drive files) run through the Pipedream proxy.
  Custom tools were chosen over MCP so writes could be approval-gated.
  Merged via PR #13.
- Phase 3b, write tools that ask first: agents can draft emails, but the run
  loop pauses before any write and shows an approval card with a full
  preview. Nothing runs until you approve. A shared run-loop helper powers
  both a new message and an approval decision. Merged via PR #14.
- A copy pass toward a warmer, concrete voice (Jinba-inspired): an
  invitational hero, an example-led placeholder, verb-first chips, and a
  "Build my agent" action. Merged via PR #15.
- Every phase was verified live in the browser. The old wizard, Runs, and
  dashboard pages still exist but are unlinked, to be deleted in a later
  cleanup phase. The Phase 7 ownership and sharing backend is kept dormant
  under the personal UX.

Deferred by choice: scheduled proactive runs (the data model is ready), the
full config side panel, and agent naming (clean auto-names plus inline
rename). Next: connect a real Gmail and dogfood the whole loop.

## 2026-07-25: Phases 8 and 9, the guided builder and the Runs rename

Merged to `main` via pull requests #8 and #9, completing the re-plan.

- Phase 8, the builder wizard: creating an agent is now a seven-step
  guided flow (identity with AI-written instructions, data sources,
  tools, guardrails, output, a safe test run, publish). The agent is
  created as a draft after the first step so knowledge picking and test
  runs work against something real; a Behavior card on the edit page
  manages the new settings and publishes abandoned drafts.
- Tool choices are enforced for real: migration 018 added enabled_tools
  and guardrails to agents, the Anthropic dual-write maps tool toggles
  onto per-tool API configs (hard enforcement, verified in the
  capability spike), the run route caps web search and knowledge
  mounting by agent config and appends guardrails to every kickoff, and
  the run dialog hides the web search control entirely for capped agents
  while prefilling the agent's default output.
- The test step earned its "comprehension moment" title in live testing:
  the test result visibly followed the guardrail added seconds earlier
  (it flagged an unexplained delay as uncertain instead of guessing).
- Phase 9, the rename: Missions are Runs everywhere users can see
  (routes /runs with permanent redirects, sidebar, board, dialogs);
  database tables and API paths deliberately keep their old names. The
  zero-agents empty state stopped telling members to wait for an admin
  (wrong since phase 7) and now teaches the one-sentence agent
  definition and links into the wizard.

## 2026-07-25: Phase 7, anyone can build and own agents

Merged to `main` via pull request #7, same day as Phase 6.

- Three migrations (015-017): agents gained `owner_id` and a
  private/company visibility setting, with every policy rewritten around
  audiences instead of roles: owners manage their own agents, admins keep
  a governance view of everything, and everyone else sees active agents
  that are company-visible or shared to them. Existing agents backfilled
  as company-visible so nothing disappeared for anyone.
- Two real security finds along the way, both fixed before shipping: the
  first policy draft recursed (agents policies referenced user_agents and
  vice versa; solved with security definer helper functions, the same
  pattern as get_my_role), and the old squad policy would have let any
  user self-assign an agent they could not see, which under the new model
  would have granted them visibility into private agents. The new insert
  policy only allows self-adding agents the caller can already see.
- The Agents page moved out of the admin area to `/agents` for everyone
  (old links redirect), sectioned into Yours, Shared with you, and From
  your company, with owner and visibility chips and actions that follow
  ownership. The sidebar shows Agents in the main group for all roles;
  the Admin group keeps Company, Users, and Integrations.
- New sharing controls on the agent page: add or remove teammates one by
  one, or flip the agent company-wide behind a confirm dialog (a founder
  decision from the re-plan). The sharing API is owner-scoped; before
  this, only admin assignment routes existed.
- Running rights follow visibility now: the mission dialog offers every
  active agent you can see, and knowledge mounting works for anyone
  allowed to run the agent (previously it silently required assignment).
- Verified live in the browser end to end as a real member account:
  created an agent, edited it, shared it with a teammate, flipped it
  company-wide, saw it in the mission dialog, and confirmed the admin
  area stays locked. Database probes covered owner, non-owner, sharing,
  and the closed escalation path.

## 2026-07-25: Phase 6, observable runs (planning councils, spike, build)

Merged to `main` via pull request #6. This session started from harsh
first-user feedback ("Run is not truly agentic") and ended with the
biggest missing piece shipped.

- Ran two multi-model planning councils over the feedback. Round 1
  verdict: the runtime is genuinely agentic but the product surface hides
  it; full strategy and roadmap in `docs/replan-2026-07-24-final-plan.md`.
  Round 2 produced screen-by-screen UX journeys
  (`docs/ux-journeys-2026-07-25-final-spec.md`) and caught a round-1
  error: no streaming or interrupt infrastructure existed in the app at
  all, so observable runs were a net-new build.
- Five product decisions signed off (seeded starter agent, Missions to
  Runs rename, honest stop labeling, confirm on company-wide sharing,
  keeping per-user notes), recorded in `docs/decisions-2026-07-25.md`.
- Capability spike against the live Managed Agents API
  (`docs/capability-matrix-2026-07-25.md`): rich tool events flow, a real
  interrupt halts generation in about a second and bills nothing for the
  interrupted request, follow-up turns work on the same session, and
  agent-level tool gating is hard enforcement. Branch A selected on all
  fronts.
- Built Phase 6 on top: migration 014 (`mission_events` log table with
  owner/admin policies, additive `stopped` and `failed` statuses, an
  `error_message` column), the run route now persists every session event,
  a server-sent-events feed replays history then tails live, a Stop route
  sends the real interrupt, and a refine route posts follow-up turns.
- New Activity timeline on the mission page: plain-language cards for web
  searches, commands, file reads, and the agent's own words, raw payloads
  behind disclosures, auto-scroll with a jump-to-latest pill, and
  reload-safe replay. Running a mission now jumps straight to the live
  view instead of blocking.
- Verified everything live in the browser: a real run with web search and
  knowledge, a mid-run reload, a mid-run stop, a follow-up that updated
  the Google Doc output, and RLS probes on the new table. Three bugs found
  and fixed during live testing (dead feed after first completion, stale
  status chip, stale server data at completion).

## 2026-07-24: Final QA pass, every roadmap requirement now verified

- Closed the last three open verification items from the test plan in one
  live run: web search produced a real current headline with a named
  source, and the brand context demonstrably shaped the output (correct
  company facts with no knowledge files mounted, and the saved voice rules
  followed to the letter).
- Full click-through of every screen against the design system. Two small
  finds, both fixed: the Company page copy still called mission runs a
  future feature, and uploaded profile pictures were not shown on the
  Users page or in the squad drawer (only initials).

## 2026-07-24: Phase 5, usage tracking, profiles, and hardening

Merged to `main` via pull request #5.

- New `usage_events` table (migration 011): every mission run and AI prompt
  writing session records its model, token counts, and an estimated cost.
  Rows are written server-side with the service role key (there is
  deliberately no insert policy); admins can read everything, users only
  their own rows. Verified live: both event types recorded with exact
  cost math, and a member probe sees zero of another user's events.
- The Usage page is real now: stat cards (mission runs, tokens used,
  estimated cost) over an events table, admins see the whole company with
  a User column, members see just themselves. Costs are labeled as
  estimates based on public per-token rates. A failed run still records
  the tokens it burned before failing.
- Settings grew a real profile card: display name editing and avatar
  upload to a public Supabase Storage bucket, with writes locked to each
  user's own folder. The sidebar picks the new picture up immediately.
  Verification caught a real bug here: the storage insert failed because
  reading the new row back needs a SELECT policy (the same Postgres lesson
  as our agent policies in migration 007); migration 013 fixed it.
- Hardening pass: member 403 sweep across all admin endpoints (including
  the new environment route), a production build scan proving no server
  secret values appear in any client bundle, and a Deploying section in
  the README covering Vercel, Supabase migrations, Pipedream production
  mode, and the mission run duration limit.

---

## 2026-07-24: Phase 4, the Missions board with real agent runs

Merged to `main` via pull request #4, together with the Users page
redesign below.

- New `missions` table (migration 010) with status and output-type enums,
  owner-scoped row security (admins can read all missions but the board is
  always personal), plus a column for the shared Claude runtime environment.
- One-time runtime setup: an "Agent runtime" card on Admin > Integrations
  creates the Claude cloud environment with one click and shows its ID once
  ready. All mission sessions run inside this shared environment.
- The mission run pipeline, verified with four real live runs (one per
  output type):
  - Each pinned knowledge file is extracted to text, uploaded, and mounted
    into the session container; the agent is told the real mounted paths.
    In the live test the agent correctly cited one of the ten mounted files.
  - Company context and the user's personal agent instructions are folded
    into every kickoff message. Verified live: a "Prepared by Run" sign-off
    instruction saved in the drawer appeared as the final row of a
    generated spreadsheet.
  - Outputs: Google Doc, Google Sheet, PDF (a Doc served via Drive's PDF
    export link, confirmed to serve real PDF bytes), or plain text. Docs
    and Sheets are created through Drive's upload-with-conversion endpoint
    because the Pipedream proxy only allows the Drive API domain, so the
    spec's Docs/Sheets write APIs could not be used. The mechanism was
    proven with a live probe first.
  - Failed runs revert the mission to queued without losing the brief, and
    the session ID is kept for inspection in the Anthropic Console.
- The Missions page is now a real Kanban: Queued, In progress, Completed
  columns, mission cards with agent chip and brief preview, a Run button on
  queued cards, and New/Edit/Delete mission dialogs (editing only while
  queued). Every mission has a detail page with the brief, the output (text
  preview plus a link to the Drive file), and the run reference.
- "My Squad" now lives in the sidebar: each assigned agent opens a
  personalisation drawer where the user keeps standing instructions for
  that agent.
- Edge cases tested through the API: running or editing a non-queued
  mission returns 409, invalid payloads return 400, agents outside your
  squad are rejected, and row security probes passed (a member sees only
  their own missions and cannot forge rows for someone else).

## 2026-07-24: Users page redesign, squads at a glance

- The Users table now shows each person's actual squad as agent name chips
  (with a +n overflow), and an empty squad renders an inline "Assign
  agents" button, so the gap and the fix are the same control.
- Assignment moved from a separate manage page into a right-side drawer:
  click any row, toggle agents in and out, changes save instantly and the
  chips update behind the drawer. The old per-user page was removed.
- The drawer pattern joined the style guide and became the base for the
  Phase 4 squad personalisation drawer.

---

## 2026-07-23: Connector detail modal polished into a proper SaaS surface

- The Google Drive modal now has two inner tabs: Overview (what the
  connection does, in plain language) and Connection (the technical record:
  account ID and connector ID with copy buttons, connected date, connected
  by, environment, and provider). A new migration stores the connect
  timestamp, captured from Pipedream's own account record.
- Both tabs share one layout rhythm: section labels in a fixed left column
  with content aligned beside them, so switching tabs feels like two views
  of one surface. Spacing across the modal was widened so nothing crowds
  the close button.
- All the copy was rewritten twice over: first cut roughly a third shorter,
  then warmed up from spec-speak to product voice ("Just file names and
  ids, nothing more. Your files stay in Drive."). The front card was also
  simplified to a single View details affordance.
- Every state verified live in the browser along the way, with the copy
  buttons confirming via toast and no console errors.

## 2026-07-23: Phase 3, Google Drive integration, built and verified

- Applied migration 008: the company settings row now stores the Pipedream
  connection (account id and who connected it), and a new agent_knowledge
  table stores which Drive files are pinned to each agent (names and ids
  only, never file contents). Row security follows the Phase 2 design rule:
  admins manage everything, members can only read knowledge for active
  agents assigned to them, verified with database probes for an assigned
  member, an unassigned user, and a blocked member write.
- Built the org-level Google Drive connection through Pipedream Connect: an
  admin clicks Connect, approves Google access on Pipedream's hosted page,
  and is redirected back to the app with the connection confirmed. Google
  credentials stay with Pipedream; the app never sees them.
- Built the Drive file listing API (supported formats only, paginated) and
  the per-agent knowledge API, plus the file picker on the agent page:
  search, file type icons, auto-saving checkboxes, a pinned count, and Load
  more. Verified against a real Drive with over 100 files, including that
  pinned selections survive reloads.
- Built server-side text extraction so agent knowledge can be mounted into
  Claude sessions as readable text: Google Docs and Sheets, Word documents,
  PDFs, and plain text or CSV. Verified live on real files of each type.
  One unreadable file can never abort a mission; it becomes an explanatory
  note instead.
- Found a real blocker during testing: the Pipedream proxy only allows the
  Drive API domain, so the reference spec's plan of calling the native
  Google Docs and Sheets APIs cannot work. Fixed by reading both through
  Drive's export endpoint, which is simpler anyway. Recorded the constraint
  for Phase 4, since mission outputs must respect the same rule.
- Hardened the integration against the official Pipedream docs: account
  selection now prefers healthy accounts and ignores dead ones, stale
  accounts from reconnects are cleaned up, duplicate pins in one save are
  deduped, and broken-connection errors tell the admin how to fix them.
- Fixed the reconnect experience after user feedback: the page you land on
  after Google consent now completes the connection itself and the app
  gained a proper toast system, so connecting, failing, and disconnecting
  all give clear feedback instead of requiring a manual refresh.
- Closed the phase with the full gate: lint and TypeScript clean, no
  console errors, member gets 403 from all six new endpoints and is
  redirected away from admin pages.

## 2026-07-23: Agent detail page redesigned, connector UI polished

- Redesigned the agent detail page taking structural cues from a reference
  product: a breadcrumb back to the listing, the agent name as the title
  with a live status chip, and the form split into three tabs
  (Configuration, System prompt, Knowledge) with Save and Cancel always
  visible beside the tabs. The system prompt editor gained a toolbar with
  Generate with AI on the left and the Edit/Preview toggle on the right.
- The Google Drive connector now shows its official logo, and its empty
  state is a proper centered hero with friendly copy and one clear action,
  echoed by a mini version on the agent Knowledge tab.
- Clicking the connected Drive card opens a detail overlay modal explaining
  what agents can read, what Run stores, and how access and disconnecting
  work, with disconnect (two-step confirm) living in the modal footer.
- All the new patterns (detail page anatomy, empty-state hero, connector
  detail modal, brand logo exception) are recorded in the style guide so
  future screens inherit them.

---

## 2026-07-22: Typography matched to the reference design tokens

- Studied a full set of design tokens extracted from the reference app and
  applied the typography faithfully: the font family is now Geist (with Geist
  Mono for code), replacing Inter.
- Corrected the type scale against the real tokens: body text returns to
  14px/20px (the earlier 15px eyeball retune was wrong), captions get an 18px
  line-height, and page titles step down from 30px bold to 24px semibold,
  which is the largest size the reference ever uses on an app page. Letter
  spacing at app sizes is removed (the reference only tightens display sizes
  36px and up).
- Deliberately NOT adopted from the tokens: their 8px and 12px corner radii
  (our 4-6px rule stands) and their color palette (ours already matches their
  warm neutral + green system almost value for value).
- Style guide and the build-ui skill updated to the new scale; verified live
  across pages with no console errors.

## 2026-07-22: Sidebar fix, duplicate Usage entry removed

- Admins used to see Usage twice (main nav and the Admin section), a leftover
  from the reference spec, and both would highlight at once on the Usage page.
  Removed the Admin-section copy so Usage lives in the main nav for every role,
  and dropped the highlight workaround that papered over the duplicate. The
  Admin group now holds only admin-exclusive destinations.

## 2026-07-21: Agent card overflow menu and meta chips

- Card actions moved into a kebab overflow menu (Edit, a new Duplicate action,
  and Archive as a red destructive item always last, after a separator). While
  a card's menu is open the card shows a subtle selected ring.
- Duplicate is a real feature: it creates a full copy of the agent (name plus
  "(copy)", same prompt and model) through the normal dual-write, so the copy
  is immediately linked to its own Claude agent.
- The card base now carries outlined meta chips instead of a text line: a
  status chip with a colored dot (green active, muted archived), the creation
  date, and the model. Both patterns are recorded in the style guide.
- Verified live: menu, selected ring, duplicate (copy appeared active and the
  count row updated), then archiving the copy re-sorted it to the back
  instantly. No console errors.

## 2026-07-21: Agent listing page anatomy

- Agents are now sorted by lifecycle: active agents always lead the grid and
  archived ones automatically move to the back (drafts and paused in between),
  newest first within each group.
- Added a listing section row between the header and the grid: agent count
  plus active count with a trailing hairline, adapted from a reference design
  but expressed in our own tokens. The pattern is recorded in the style guide
  for reuse on future listing pages. Grid now steps up to four columns on very
  wide screens.

## 2026-07-21: Agent card polish

- Fixed the agent cards so the action row is always pinned to the bottom and
  all cards in a row share the same height, regardless of description length.
- Replaced the blunt faded look on archived cards with a proper disabled
  treatment: a subtle muted background wash, muted title, and no hover
  response. Active cards now lift gently on hover (slightly stronger outline
  plus a soft shadow), all through existing color tokens.

## 2026-07-21: Radius tightening across the whole UI

- New design rule: every corner in the app sits between 4px and 6px (only true
  circles like avatars are exempt). The token scale in `globals.css` enforces
  it (small 4px, medium 5px, large and above clamped to 6px), so every
  component inherited the change from one place: buttons, inputs, textareas,
  selects and their dropdowns, dialogs, cards, badges, tabs, tooltips, and
  sidebar menu items.
- Removed the last hardcoded radius values (the sidebar menu's 8px) in favor
  of the token scale, and updated both the style guide and the build-ui skill
  so the rule is enforced in future work: never write raw pixel radii.
- Visually verified across the login screen, agent cards, menu items, the
  model dropdown, and the generate dialog. No console errors; lint and
  TypeScript checks clean.

## 2026-07-21: Agent lifecycle redesign (post-review hardening)

- After a design deep dive on the archive bug, replaced the crude `is_active`
  boolean with a proper lifecycle status (`draft`, `active`, `paused`,
  `archived`) plus an `archived_at` timestamp, matching how the Anthropic API
  itself models agents.
- Reshaped the agents row security into two audience-scoped policies: admins
  manage everything; regular users can read only active agents that are
  actually assigned to them. The design rule adopted: row security answers
  "who are you", queries answer "what state do you want", and a row's mutable
  state must never control visibility for the role that changes it.
- Added sync metadata for the Claude dual-write (`claude_version`,
  `synced_at`), so updates no longer need an extra read from Anthropic and
  drift between the two systems is detectable. Updates fall back gracefully
  if the stored version is stale.
- Migration was dry-run in rolled-back transactions first, with security
  probes for the admin archive case, member visibility, and member write
  attempts, before being applied for real. All live flows then re-verified in
  the browser.

## 2026-07-21: Phase 2, admin configuration, built and verified

- Applied five database migrations to Supabase: `agents` (with row security so
  only admins can change them), `company_settings` (a single shared row of
  company context), `user_agents` (which agents each user has in their squad),
  a function hardening fix from the security advisor, and an extra policy so
  admins can see archived agents.
- Verified the installed Anthropic SDK before writing code, which caught two
  differences from the reference spec: the system prompt field is named
  `system`, and updates need the agent's current version number. Also switched
  the default model to `claude-sonnet-5` (the spec named an older model).
- Built six server API routes, each enforcing admin authorization itself:
  list/create agents, update/archive an agent (create and update write to both
  Supabase and the Claude Managed Agents API, so every agent has a linked
  Claude agent with the full toolset), AI prompt generation, company context
  read/save, and squad assign/remove.
- Built the admin screens: an agent card grid with a New Agent flow, an agent
  form with model picker and an Edit/Preview system prompt editor (markdown
  preview), a Generate with AI dialog that warns when no company context is
  saved, the Company context editor, a Users table with role badges and squad
  counts, and a per-user squad assignment screen.
- Found and fixed a real bug during testing: archiving an agent was rejected by
  the database because making it inactive also made it invisible to the admin
  under the row security rules, which the database refuses. An added policy now
  lets admins see all agents, which also makes the Archived badge work.
- Full live verification in the browser: company context saves; AI generation
  produced an on-brand prompt using the saved context; agent create, edit, and
  archive all round-trip to Anthropic (verified the linked agent id in the
  database); squad assign and unassign both work; a signed-in member gets 403
  from all five admin APIs, is redirected away from admin pages, and sees no
  Admin menu; signed-out requests get 401; no browser console errors; lint and
  TypeScript checks clean.
- Test data left in place: one real agent (Marketing Writer, assigned to the
  member test user), one archived throwaway agent, and a sample company context.

## 2026-07-21: Progress log, README, and reusable skills added

- Created this progress log and rewrote the README with a project intro and an
  at-a-glance progress section, so the current status is always visible on
  GitHub and locally.
- Analysed all past work sessions to find repeated, token-expensive workflows,
  then captured the two most valuable ones as reusable Claude Code skills in
  `.claude/skills/`:
  - `build-ui`: how to build UI the styleguide way, including every component,
    icon, radius, and CSS convention already verified in this codebase.
  - `phase-gate`: the full phase-end verification ritual (lint, typecheck,
    route-protection matrix, role-based browser smoke test, console check).
- These skills load on demand in future sessions instead of re-deriving the
  procedures each time. No credentials are stored in them; the repo is public.

## 2026-07-21: Repo published, history cleaned, Phase 1 merged to main

- Created the public GitHub repository and connected the local project to it.
- Before the first push, scanned the entire git history to confirm no secret keys,
  tokens, or credentials had ever been committed. The scan came back clean. Real
  secrets live only in `.env.local`, which is ignored by git and never leaves the
  machine.
- Pushed the work to GitHub across three branches: `main`, `phase-1`, and
  `design/reference-styleguide`.
- Realised internal planning documents had been included in the push. Rewrote the
  git history on all branches to remove them completely (not just delete them going
  forward), then force-pushed the cleaned history. Verified on GitHub that they are
  gone. The files themselves are untouched on the local machine.
- Added a permanent guard: the `docs/` folder is now ignored by git on every
  branch, so internal documents can never be committed again by accident. The one
  exception is `docs/styleguide.md`, the public design style guide, which stays
  tracked deliberately.
- Opened and merged pull request #1, bringing everything into `main`: the Phase 1
  foundation, the visual restyle, and the housekeeping commits. `main` is now the
  single source of truth.
- Re-verified the merged result: TypeScript check passes cleanly.
- Created a fresh `phase-2` branch off the merged `main`, ready for the next stage.
- The old `phase-1` and `design/reference-styleguide` branches are fully contained
  in `main` and safe to delete on GitHub whenever convenient.

## 2026-07-21: Phase 1 final review (earlier the same day)

- Re-audited Phase 1 against the roadmap checklist instead of trusting memory.
  Every deliverable is present:
  - All required packages installed (UI component library, Supabase clients,
    Anthropic SDK, icon library, Tailwind v4).
  - Login and registration pages, plus all seven dashboard sections: Missions,
    Usage, Agents, Company, Users, Integrations, and Settings (placeholders where
    later phases will fill in real features).
  - Session handling follows the framework's current conventions (`proxy.ts`).
  - Role-based access is enforced in two layers: the shared layout requires a
    signed-in user, and every admin page independently re-checks the admin role.
- Ran the full phase-end test gate, all passing:
  - Linting and TypeScript checks: clean.
  - Signed-out visitors are redirected to the login page from every protected route.
  - An already-signed-in visitor to the login page is bounced into the app.
  - A regular member sees no Admin section in the sidebar, and typing an admin URL
    directly redirects them away. Access control holds at the route level, not
    just in the UI.
  - No browser console errors anywhere.
- Verdict: **Phase 1 is 100% done.**

## 2026-07-21: Visual restyle to match the reference design

- Studied the supplied reference screenshots and distilled them into a reusable
  style guide (`docs/styleguide.md`) covering colors, typography, spacing, corner
  radii, iconography, and component recipes.
- Restyled the whole app through design tokens only. No page content or
  structure was changed:
  - Warm paper-gray canvas with the sidebar and main content floating as white
    rounded cards; deep forest green as the single strong brand color.
  - Body and menu text retuned to 15px via one token change (applies app-wide).
  - Switched all icons to the monochrome Lucide family with subtle color
    treatment (soft by default, full ink on hover/active).
  - Menu buttons set to exactly 8px corner radius after iterating on feedback;
    sidebar narrowed to 240px.
- Every iteration was verified live in the browser against the screenshots.

## Earlier: Phase 1 foundation and app shell (completed 2026-07-21)

- Set up the Next.js 16 project with Tailwind v4, strict TypeScript, and the
  shadcn/base-nova component library.
- Connected Supabase: email/password sign-in, sign-up, and sign-out, with user
  profiles and admin/user roles stored in the database (first migration applied).
- Built the app shell: collapsible sidebar with main navigation (Missions, Usage),
  an Admin section (Agents, Company, Users, Integrations, Usage), Settings, and
  the signed-in user's profile card with sign-out.
- Added placeholder pages for every section so each later phase has a home.
- Protected all app routes behind authentication and admin routes behind the
  admin role.

---

## Next up (high level)

- **Phase 2, admin configuration:** company settings and agent management
  (create/edit/archive agents, AI-assisted prompt writing, assigning agents to
  users). Work happens on the `phase-2` branch.
- Later phases: Google Drive integration and knowledge files, the Missions board
  with real agent runs, then usage tracking and production hardening.
