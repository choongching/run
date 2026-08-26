---
name: build-ui
description: Build or modify UI in the Run app the styleguide way. Use for any task that creates or changes components, pages, styling, or icons.
---

# Build UI for Run

Follow this procedure whenever creating or changing UI. It encodes the design
system plus every convention already verified the hard way in this codebase.
Goal: zero re-derivation, zero styling drift.

## The shape of a page, before anything else

`docs/styleguide.md` section **7a** is the container pattern, and
`components/section-card.tsx` is the code. A page is a stack of `SectionCard`s;
a card that holds a list puts it in a `RowBox`, hairlines between the rows and
nothing else; the card says nothing beyond its heading; an empty state fills the
box's slot so the card stays. A section of form FIELDS is the exception and
keeps them on the card, because a hairline between two inputs reads as a table
of inputs.

The row is part of that shape, not a per-page invention. `Row` takes `item`
and renders as the `<li>` a `RowBox list` wants, so there is no reason left to
hand-roll one: Knowledge and Routines both did, only because the component was
a `<div>`, and both drifted from the recipe within a week. Its anatomy also
answers where a fact goes. The DETAIL LINE carries what the thing is (kind,
size, when it changed), middle dots between, read left to right. The TRAILING
edge carries state that lines up down the list (a meta chip, a status word)
plus the kebab. Nothing goes in a third column between them: a `flex-1` block
floated mid-row lands in a different place on every row and leaves a ragged
gap, which is what Knowledge's agent chips did until 2026-08-25. Below `sm`
that chip stands down and its words join the detail line, because a 326px row
has no width to lend.

Do not hand-roll `rounded-xl border border-border bg-card` for a new section,
and never use the shadcn `Card` primitive on a page: it draws a ring rather
than our border token, which is how Settings ended up the only differently
outlined page in the app.

Why this leads: on 2026-08-21 a survey found thirteen ways four pages
disagreed about the same thing, including four row-padding values and five
treatments of a section heading. Every one of them was written by someone
following this skill and solving the problem locally. If a page needs a
container shape 7a does not cover, that is a change to 7a and the component,
not a new arrangement in one file.

**The styleguide describes what is built, and only that.** It carried recipes
for tables, tabs, breadcrumbs and a kanban board that Run has never had, and
one of its empty-state rules specified a headline size nothing used, which is
how a real defect got past review. If a rule in that file and the app
disagree, one of them is a bug: say which, fix it in the same pass, and never
quietly work around it. Same duty when you add a rule, it goes in only once
code follows it.

## 0. Before you build any of it

Two questions, in this order. Both have cost the project real work when
skipped.

**Does this need a new control at all?** Run's answer to "how does the person
know X" is usually that the agent says X, in the conversation, at the moment
it matters. The machinery for that already exists: `ask_user` (a question with
options), the connect card, the review card, the routine card. A connector
chip row and a pinned composer token were both designed, prototyped, and cut
in one evening; what shipped instead was one more question in the setup
interview, using cards that already existed. The comment at
`lib/chat/onboarding.ts:59-67` is the standing argument: every agent is handed
the same tools, so a permanent "what I can reach" display would tell someone
whose agent reads documents that it also wants their email. Ambient chrome
states things whether or not they are relevant; conversation states them when
they are.

That argument has now cut three things: the connector chip row, the pinned
composer token, and **slash commands in the composer** (founder decision,
2026-08-21). Treat a fourth proposal of the same shape as already answered
unless something below has changed.

The slash research is worth keeping, because it was more one-sided than
expected. **GitLab deprecated slash commands in Duo Chat**; their own design
system says to refrain from using them. The pattern libraries name three
places not to use them, and Run is all three: consumer surfaces where people
never learn command syntax, simple products where a visible control beats a
hidden one, and mobile-first composers where the menu fights the keyboard.
The pattern trades discoverability for power-user speed and only works
"layered on top of discoverable buttons", which is the opposite of what a
plain-language product wants. A command menu is also a permanent capability
list, so it fails the same test as the chip row above.

The Run answer to "how do I find out what this can do" is the agent answering
that question in the conversation, scoped to the one agent's actual job. If
`@` ever earns a place it will be for a real named object, most likely
another agent once someone owns several; nothing today qualifies.
See `docs/guidance-patterns-spike-2026-08-21.md`.

**A fallback only fires if the failure is a failure.** Earned 2026-08-21 on the
source chip. The favicon route answered "no icon" with a 200 and a transparent
pixel, reasoning that a browser should never paint a broken image. But a 200
means the image LOADED, so `onError` never fired, the globe fallback never
appeared, and every site that refused us rendered as an empty circle. Nothing
looked broken and nothing was right. Whenever a component has a fallback path,
check that the thing it waits for can actually happen.

**Three pill and popover traps, all paid for once:** a pill needs more
horizontal inset than its height implies, because the rounded edge curves
furthest inward exactly at the vertical centre where the content sits, so
padding that looks right on a rectangle reads as touching; an icon inside a
pill should be a circle, concentric rather than arguing with it at the tightest
point; and an absolutely positioned card STILL inherits typography from
whatever it is nested in, so a card inside a `<p>` picks up the paragraph's
line-height through the strut and needs its own reset. Also scope icon styles
at the top level, not under the one component you first used them in, or every
other use falls back to inline text.

**Teach the SYSTEM, never teach prompt skill.** The rule for any help element,
settled 2026-08-21 after researching how v0, Lovable and Ona guide people. A
tooltip may state a fact about our machinery that nobody can deduce by
looking: "the chat history is not included in this instruction", "your setup
answers are added underneath what you type". It may never coach someone on
writing better prompts. A product that has to teach prompting is admitting it
needs the user to be good at prompting, and Run's whole pitch is that it does
not.

The research backs the shape rather than just the taste. v0 keeps its
prompt-writing framework on a BLOG, not in the app, and Vercel's design system
names the EMPTY STATE as the in-app teaching surface (variants blank slate /
informational / educational / guide; one primary CTA, and three CTAs means the
design is wrong; labels are verb plus noun, "Import Repository" never "Get
Started"). Competitors that put tips beside the composer do it because their
input is ONE-SHOT: a thin description produces a bad bot with no way back.
Ours is a conversation, and the interview repairs a thin prompt, which is why
their fix does not transfer. Full spike:
`docs/guidance-patterns-spike-2026-08-21.md`.

The help affordance that exists is `components/ui/help-tip.tsx`. Use it; do
not invent a second one.

**Anything that moves belongs to the `motion` skill.** Load it before writing
a keyframe, a transition, a loop, or an entrance. It carries the WCAG 2.2.2
gate (auto-start plus over five seconds plus other content beside it needs a
way to pause it, and Run's answer is to stop rather than to add a button),
the one-animation-per-surface rule, and the reduced-motion floor.

**Show it before you build it.** For anything beyond a tweak, build a lo-fi
HTML prototype in the scratchpad, publish it with the Artifact tool, and let
the founder react. They ask for this by name ("can we see a better wireframe
first, before committing the work") and it is cheaper than the alternative in
every case so far: the schedule prototype settled the whole Routines shape,
and the composer wireframe surfaced the cut above before a line of app code
existed. Make the prototype clickable, show every state, and include the
mobile width.

## 1. Load the rules first

- Read `docs/styleguide.md` (local file, git-ignored except this one is tracked).
  It defines tokens, typography, radii, spacing, iconography, and component
  recipes. Style ONLY through tokens (`bg-primary`, `text-muted-foreground`),
  never hard-coded hex or arbitrary colors.
- This is Next.js 16 with breaking changes from training data. Before writing
  route/server code, read the relevant guide in `node_modules/next/dist/docs/`.
  Verified deltas: route `params` are Promises; auth/session middleware is
  `proxy.ts`, not `middleware.ts`.

## 2. Verified conventions (learned in this repo, do not rediscover)

- **base-nova components:** use `SidebarMenuButton render={<Link href=... />}`
  style render props. `Button asChild` is NOT supported; for link-shaped buttons
  use link elements with button classes.
- **Icons:** monochrome Lucide only. App nav icons are re-exported from
  `components/nav-icons.tsx`; add or swap icons THERE, never inline new icon
  styles in pages. Before using any Lucide icon, verify the export exists:
  `grep "declare const IconName" node_modules/lucide-react/dist/lucide-react.d.ts`
  (the `dist/esm/icons/*.js` path layout does not exist in the installed version).
- **Icon sizing:** `size-4.5 stroke-[1.75]` in nav, `size-4` in dense contexts.
  Icon tint pattern: `[&_svg]:text-sidebar-foreground/70` at rest, full ink on
  hover/active via stacked variants like `hover:[&_svg]:text-sidebar-foreground`.
- **Radii:** every corner sits between 4px and 6px, enforced by the token scale
  in `globals.css` (`sm` 4px, `md` 5px, `lg` and above clamped to 6px). Use
  `rounded-lg` for buttons/inputs/menu items, `rounded-md` for badges and small
  controls, `rounded-xl` for cards (renders 6px). NEVER write raw
  `rounded-[Npx]`; only true circles use `rounded-full`.
- **Type:** family is Geist (`--font-geist-sans`); body is `text-sm` at
  Tailwind's default 14px/20px (do NOT retune it); `text-xs` has an 18px
  line-height token. Page title `text-2xl font-semibold` (24px is the page
  maximum, no tracking classes), subtitle `text-base text-muted-foreground
  mt-1.5` (use `components/page-header.tsx`). Weights: 500 for active/labels,
  600 for titles, 700 rare. ONE sanctioned exception to the 24px cap: the
  home hero (`app/(dashboard)/page.tsx` + `components/home/`) sizes up
  (text-3xl/4xl headline, text-base composer). It is expressed as local
  utility classes in those files only, never as tokens, props, or shared
  variants, and no other page takes hero sizing without the founder saying
  so. Second founder-set exception: the chat surface reads 1px up via
  `.run-chat-type` on ConfigDock's root, which overrides the theme's
  `--text-*` font-size variables in a scoped block in globals.css; every
  text-* utility inside rescales (line heights are ratios and follow), and
  nothing outside the class moves. That variable-override trick is THE way
  to rescale a whole surface; never bulk-edit utility classes to do it.
- **Mobile (below md) is a first-class mode**: read styleguide section 5b
  before any responsive work. The essentials: mobile = below md, ONE split;
  44px tap floor (`size-11`/`min-h-11`, `md:` resets); inputs are 16px on
  mobile (the Input primitive and both composers already carry it: below
  16px iOS zooms on focus); full-bleed surfaces with a `px-4` gutter;
  full-screen takeovers for Configure and dialogs (inset-0 + h-svh +
  reset the dialog's centering transform); safe-area padding on
  bottom-pinned bars; nothing operable only by hover. TYPE is a three-tier
  ladder of variable overrides (app 14/15, chat 15/16, config 15/17
  desktop/mobile body): a surface's scale is defined in one scope class in
  globals, never by editing utility classes.
- **Mobile patterns proven on the founder's device (2026-07-31 night):**
  the drawer is a full-screen sheet (`w-full max-w-none` on the mobile
  SheetContent, its own close button unhidden and grown to the tap floor);
  the chat card sheds border/radius/padding below md (card px-4 + thread
  px-1 = ~20px text inset, founder's cap is 32); a primary button may go
  icon-only on mobile (`max-md:hidden` on the label, square at size-11,
  aria-label carrying the name); FlipWord centres on the ACTIVE word below
  md by making inactive words `max-md:absolute` (the desktop ghost-width
  that prevents reflow visibly pushes short words sideways on a phone).
  TRAP: a component's own size-variant classes (peer-data top-2) outrank
  `max-md:` overrides unpredictably; pin with a trailing `!` (max-md:top-3!).
- **NEVER run `npx prettier` on this repo.** There is no prettier config and
  the code is not prettier-formatted (single quotes, no semicolons), so it
  rewrites hundreds of lines in a foreign style. Match the file you are in.
- **CSS overrides:** Tailwind v4 cascade layers mean the utilities layer beats
  `@layer components` regardless of selector specificity. Any custom rule that
  must override a utility-classed element goes in `@layer utilities` in
  `globals.css` (see the existing sidebar shell override there as the pattern).
- **Dark mode:** every new token or color decision must be mirrored in the
  `.dark` block in `globals.css`.
- **Sidebar shell:** `variant="inset"`; sidebar width token is 15rem. Do not
  restyle the shell per page.
- **Overlay forms (Dialog/Sheet):** React 19's `react-hooks/set-state-in-effect`
  lint forbids seeding form state from props in an effect. Instead, put the
  form state in an inner child component rendered inside
  DialogContent/SheetContent with `key={recordId}`: base-nova unmounts closed
  overlay content, so the `useState` initializers re-seed fresh on every open
  (canonical example: the keyed inner body in
  `components/chat/config-panel.tsx`, `key={agentId}`).
- **Empty states are dashed boxes, app-wide (founder decision 2026-07-30).**
  Never a floating sentence, and never instead of the card: the box fills the
  slot the rows would have taken, INSIDE the SectionCard, so the page keeps
  its shape. Two sizes: FULL (pages, dialogs) is `rounded-lg border
  border-dashed border-border` centred at `py-12`, with a `size-11 rounded-lg
  border border-border bg-background` tile, a `size-5 text-muted-foreground`
  icon, a `text-base font-medium` headline and one muted line; COMPACT
  (sidebar, docked panels) is `rounded-lg border border-dashed border-border
  px-2.5 py-2 text-xs text-muted-foreground`, one line, no icon. The body copy
  carries the ACTION only; what the thing is belongs in the card's
  description. In dialogs, loading and empty share one min-height box so the
  surface does not jump when the answer arrives.
- **Status is one icon, colour carries the state.** Beside the thing's name:
  the same Check in `text-primary` (on) or `text-muted-foreground/40` (off),
  tooltip holds the word, aria-label keeps it for screen readers (see
  `components/connectors/connector-list.tsx`). A different icon per state
  (dashed circle, X) read as weird or as an error; the founder rejected it.
- **Runs of step lines fold into one compact block** (see StepsBlock in
  chat-thread): closed by default reading "N steps" with a chevron; while
  live, the header IS the current step (shimmer + spinner) so feedback never
  disappears; open lists every step. Steps only ever narrate real work from
  real events; never invent detail the stream did not provide.
- **Rich hover cards are hand-rolled, not tooltips.** The base-nova tooltip
  is a dark one-line chip; a breakdown card is a relative wrapper +
  mouseenter state + absolute bottom-full card (see run-donut, usage-meter).
  Anchor from the edge nearest the container's edge (right-0 in a right
  corner) so it opens inward. The surface stays fully opaque: an alpha
  hover tint turns a floating card into glass (bg-muted/40 let the sidebar
  bleed through), and the founder's final call was no tint at all: solid
  card, cursor-pointer and a title-row chevron carry the affordance, and
  the WHOLE card is the click target so the chevron keeps its promise.
- **A card hanging off INLINE content is portalled, not absolutely
  positioned.** The two above hang off block-level controls, where a relative
  wrapper is right. A card anchored to something inside a paragraph (the
  source chip) cannot be: a div inside a `<p>` is invalid nesting React warns
  about in the console, and any ancestor with hidden overflow clips it.
  `createPortal` to `document.body` with `position: fixed`, coordinates taken
  from the trigger's rect when it opens, and then three consequences that are
  not optional: it closes on scroll and on resize (viewport coordinates go
  stale), it picks left or right anchoring from `rect.left + width` against
  the window, and it flips below when `rect.top` leaves no room above.
  Portalled content still bubbles through the REACT tree, so an Escape
  handler on the trigger's wrapper catches keys from inside the card.
- **A hover card that opens over a gap needs the gap covered.** The trigger's
  mouseleave fires as the pointer crosses into the card, so the card cancels
  the pending close on its own mouseenter. Open on a delay (about 250ms) so a
  pointer passing through does not flash it; close on a short one.
- **A hover-only affordance is a phone-only omission.** Say so out loud in the
  component and in the log rather than discovering it on a device. Focus
  handlers cover the keyboard for free; touch usually does not have an answer
  when the trigger's tap already has a job.
- **In a history list, status speaks only for the exception.** "Done" on
  every row of finished work read as meaningless and "Active" would
  misdescribe a past event; ordinary rows carry nothing, failures carry one
  quiet chip.
- **All rows clickable or none.** Linking only the rows that still have a
  live target (deleted agents did not) made a list feel broken. Founder
  decision: a log row is a receipt, not a door; consistency beats the
  shortcut.
- **History/list rows take the deployment-list shape**: no header row, no
  vertical hairlines; the name leads, the facts (date · time, exception
  chip) gather at the trailing edge.
- **Composer action row**: all controls sit together at the trailing edge
  (meter ring, paperclip, send). The attach icon is Paperclip, a founder
  reversal of the earlier + decision; do not flip it back without them.
- **Drop zones are dashed boxes that are real buttons.** Same language as
  empty states; the button doubles as click-to-browse and keyboard access,
  drops feed the same handler as the picker, and the size ("15&nbsp;MB")
  keeps a non-breaking space (see `components/chat/knowledge-section.tsx`).
  Do not stack a drop zone beside an empty-state strip; the zone IS the
  empty state.
- **The row is the door, and the kebab is not.** A row whose record has more
  to it than fits on two lines opens that record on click (`cursor-pointer
  hover:bg-muted/40`), and the trailing cluster stops the click reaching the
  row (`onClick={(e) => e.stopPropagation()}`). One record opens in a DIALOG,
  not a Sheet: the styleguide said drawer for a year while the app never had
  one, because the founder picked the centred dialog after seeing both.
- **A row action's spinner goes INSIDE the button it replaces.** Swapping the
  kebab for a bare `Loader2` resizes the row under the pointer mid-action;
  keep the button mounted and disabled and put the spinner where the icon was.
- **A menu sizes to its content, never to its anchor.** Fixed at the source
  2026-08-25: `DropdownMenuContent` is
  `min-w-[max(8rem,var(--anchor-width))]`. It used to be `w-(--anchor-width)`,
  right for the wide account button and wrong for every row kebab in the app,
  which wrapped "Use only where attached" onto two lines. Routines had patched
  around it locally with `min-w-52`; a local width patch on a shared primitive
  is the smell that the primitive is wrong.
- **Overlay exit animations:** keep the selected record in state after close
  (a separate `open` boolean drives visibility) so the overlay keeps its
  content through the exit transition instead of flashing empty.
- **Re-seeding state outside overlays:** the same lint
  (`react-hooks/set-state-in-effect`) fires anywhere props are synced into
  state. The general fix is the same as the overlay one: key the component by
  the data it seeds from, so a change remounts it and the `useState`
  initializers run again (`<UsageMeter key={usage.used} …>`). Reach for a key
  before reaching for an effect.
- **Never read a ref during render** (`react-hooks/refs`, "Cannot access refs
  during render"). If JSX needs a value that a callback knows, put it in state
  at the moment it becomes true, not in a ref you read while rendering. This
  bit the retry button: `retryRef.current` in JSX had to become a `canRetry`
  state set at failure time.
- **Error boundaries are Next 16 shaped:** an `error.tsx` receives
  `unstable_retry`, NOT `reset`. See `app/(dashboard)/error.tsx`.
- **Track and rail colours:** `bg-muted` is indistinguishable from the sidebar
  canvas. Use `bg-border` for the unfilled part of any meter or progress track,
  and `bg-foreground/70` for the fill, escalating to `bg-chart-4` and
  `bg-destructive` at threshold.
- **Every standard page lives in PageShell** (`components/page-shell.tsx`):
  the same centered `max-w-thread` column the chat uses, wrapping the header,
  body AND the route's loading.tsx. Never give a page or a card its own width
  cap; two caps on one page is how Settings ended up with mismatched card
  edges. Chat is the one page with its own layout.
- **Tooltips:** the config-dock recipe (`TooltipProvider delay={300}` +
  `TooltipTrigger render={...}`). One element cannot be two base-nova
  triggers; to put a tooltip on a DialogTrigger, control the dialog with
  state and let the tooltip own the button (see usage-meter). Content is the
  action or the consequence in one line, no period ("See this month's runs",
  "Your agents will stop using this account").
- **Status chips sit beside the title, not under it** (a state of the thing,
  not a second line about it): `flex items-center gap-2`, chip is `text-xs
  text-primary` with a `Check size-3` for good states. Icon tiles next to a
  two-line row are `size-10` with a `size-5` icon so tile height matches
  title plus detail.
- **An empty sidebar list keeps its group label** and shows one dashed slot
  ("Your agents will live here") rather than disappearing.
- **A border is what competes, not the size.** Earned 2026-08-26 trying to
  quiet the home rail. A pill one step smaller still fought the composer,
  because a bordered pill and a bordered box carry the same weight at any
  scale. Dropping the outline for a `bg-muted` fill quieted it immediately,
  and left the composer owning the only border on the screen. To make a
  control recede, take its outline before you take its size. It still needs a
  surface to aim at: a control with no fill and no border reads as a caption
  you happen to be able to click, which trips the rule that what is
  interactive should look interactive.
- **Painting a gradient on a border: the prefixed mask pair goes FIRST.**
  `-webkit-mask` then `-webkit-mask-composite: xor`, THEN `mask` then
  `mask-composite: exclude`. Each shorthand resets its own composite mode, so
  whichever is written last wins; standard-first floods the whole element and
  looks like a rendering bug. Full recipe in the `motion` skill.
- **React attaches `wheel` listeners PASSIVELY at the root**, so an `onWheel`
  in JSX can never `preventDefault`. A horizontal scroller written that way
  moves sideways AND scrolls whatever is behind it. Attach a native listener
  with `{ passive: false }` inside the effect that owns the element (see
  `components/home/job-rail.tsx`). This is invisible on a page that does not
  scroll, which is exactly how it reaches a short laptop screen.
- **A horizontal rail's edge fade must be a FACT.** Fade a side only when that
  side has content behind it, and drop it at the end; a permanent fade on both
  edges claims there is more where there is nothing, which is a worse lie than
  a hard cut. Hide the scrollbar with the existing `no-scrollbar` utility
  (it ships in shadcn's stylesheet, the sidebar already uses it), centre the
  row when nothing overflows, and suppress the click on a pill when the
  pointer travelled more than a few pixels, or dragging the rail past one
  picks it. Arrow buttons were built and cut: they sat on top of the first and
  last item and clipped them.
- **JSX comments cannot lead a return:** `{/* */}` directly inside
  `return (...)` before the root element is a syntax error; put it above the
  return or inside the element.

## 3. Verify visually before declaring done

Use Chrome tools efficiently: batch actions with `browser_batch`, do not issue
single calls in sequence.

1. Screenshot the changed screen at normal size.
2. `zoom` into changed regions to inspect radii, spacing, and icon rendering.
3. Simulate `hover` on interactive elements to check rest/hover/active states.
4. Check console: `read_console_messages` with `onlyErrors: true`.
5. Compare against the styleguide recipes, not memory.

Note: `npm run dev` may report "failed exit 1" as a background task while
actually running fine. Trust `curl -s -o /dev/null -w "%{http_code}" localhost:3000`,
not the background status.

## 4. Done means

Lint passes, typecheck passes, no console errors, and the change is expressed
through tokens/recipes so the next screen inherits it for free.
