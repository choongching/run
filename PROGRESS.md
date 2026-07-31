# Run Progress Log

A running, plain-English record of what has been done on this project, so anyone
(including future us) can open this file and know exactly where we left off.

**How this file works:** every work session ends by adding a new dated entry at the
top of the log below, written point by point. Never delete old entries, this is
the project's history. This file is public; never write secrets, passwords, API
keys, or internal-only plans in here.

**Where we left off:** The core is validated and the interface has been
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
