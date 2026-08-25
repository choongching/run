# Run: Visual Style Guide

This describes **Run as it is built**, not a look to aim at. Every recipe below
has code behind it, and a recipe with no code in the app is not guidance, it is
fiction: it cost us a real defect the day the empty-state headline in here
turned out to be a size nothing had ever used. Rewritten 2026-08-21 for that
reason, when the page containers were unified.

Tokens map to CSS variables in `app/globals.css`; always style through them
(`bg-primary`, `text-muted-foreground`), never hard-coded hex.

**Section 7a is the shape of a page.** Read it before building any page or
section; the rest of section 7 is the parts that go inside it.

## 1. Overall look

- Warm paper-gray **canvas** with the sidebar as flat structure and the content
  as **white rounded cards** (1px border, no shadow, ~8px gutter around them).
  Surfaces that sit in the page flow are flat: the border and the canvas behind
  them do the separating. Shadow is reserved for things that genuinely float
  above content (dialogs, sheets, menus, tooltips, toasts, the FAB).
- Near-black warm ink for text, one **deep forest green** as the only strong brand color.
- Small pops of color are reserved for data: blue count badges, pink/green avatars.
- Everything else is quiet: hairline borders, generous whitespace, no heavy dividers.

## 2. Color tokens

| Token | Value (approx hex) | Used for |
|---|---|---|
| `--background` | `#FFFFFF` | main content card |
| `--foreground` | `#1F1E1B` | primary ink |
| `--sidebar` | `#F5F4F1` | app canvas behind the cards |
| `--card` | `#FFFFFF` | sidebar card, panels, toasts |
| `--primary` | `#1D4231` deep green | Create button, FAB, checked checkboxes |
| `--primary-foreground` | `#FFFFFF` | text/icons on green |
| `--secondary` / `--muted` | `#F4F3F0` | subtle fills, hover washes |
| `--muted-foreground` | `#807D74` | timestamps, placeholders, sub-labels |
| `--accent` / `--sidebar-accent` | `#ECEBE6` | nav hover + active item background |
| `--border` / `--input` | `#E6E5E0` | hairlines, input borders, table dividers |
| `--ring` | deep green `oklch(0.48 0.095 155)` | focus rings |
| `--shadow-focus` | the same green, low and soft | the lift under a focused field |
| `--chart-1…5` | green, blue, pink, amber, purple | avatars, charts, count badges |
| `--destructive` | red (unchanged) | Move to Trash, errors |

Dark mode mirrors the same relationships on warm charcoal (`.dark` block in globals.css);
primary flips to a lighter green with dark text.

**Focus.** Two recipes, and the difference is deliberate.

- **Ordinary fields** (inputs, textareas, selects, buttons, checkboxes):
  `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10`.
  The border does the work; the halo is a whisper at 10%. It used to be 50%,
  which read as a fat tinted band around every field on a settings page.
- **Composer shells only** (the home box and the chat box, a container
  wrapping a textarea and its buttons): `focus-within:border-ring
  focus-within:shadow-focus`, with `transition-shadow` so it arrives rather
  than snaps. One 1px green edge and a soft green lift, no ring at all: a
  2px ring around a box that wide reads as a slab (founder rejected `ring-2`
  and a 0.8px border on the way to this).
  **Do not put `shadow-focus` on ordinary inputs** (founder, 2026-08-01): a
  form where every field lifts is noise. The composer earns it because it is
  the one place someone is about to spend real effort.
- **Focus fades in, never snaps.** Every focusable field carries
  `run-focus-fade` (globals.css): 180ms on colour, background, border and
  box-shadow. `transition-colors` does NOT cover box-shadow, which is what
  rings and the lift are made of, so without this class the ring appears in
  a single frame. Disabled under `prefers-reduced-motion`.
- No component hand-rolls a focus style. Six files did (the chat header,
  knowledge search, the config panel, the review card, the options card) and
  all now use the recipe above.
- The shadow is always the green, never a grey or black, in both themes.
  Dark uses the lighter primary at more alpha, because a deep green glow
  disappears against charcoal.
- The ring sits at 0.48 lightness, close to primary, because the old 0.6 at
  half opacity read as a tint rather than a decision. On dark it goes up, not
  down: contrast is the goal, not the hue.
- `--shadow-focus` is declared in `@theme` so the `shadow-focus` utility
  exists, then given its real value per theme in `:root` and `.dark`.

## 3. Typography

Matched to the reference design tokens (Geist-based scale). The sizes below
are the DESKTOP APP tier; type is a three-tier ladder (app, chat, Configure)
with a larger mobile scale per tier, defined entirely as `--text-*` variable
overrides. The ladder table and the rules live in section 5b.

- **Family:** Geist (`--font-sans`, variable), Geist Mono for code. No serif.
- **Scale** (Tailwind classes → reference tokens):
  - `text-xs` = caption/label, 12px with a retuned **18px** line-height
    (`--text-xs--line-height` in globals.css).
  - `text-sm` = body-sm, **14px/20px** (Tailwind default; the old 15px retune
    is gone). This is the body size: nav items, table cells, controls.
  - `text-base` = body-md, 16px/24px: page subtitles, prose.
  - `text-xl` = body-xl, 20px: auth-card titles and similar.
  - `text-2xl` = display-xs, **24px/32px**: page titles. Nothing on an app
    page renders larger than 24px.
- **Weights:** 400 body, 500 medium (active nav, labels, chips), 600 semibold
  (page titles, card titles, table headers), 700 reserved for rare emphasis.
- **Letter-spacing:** small text runs a hair open. `text-xs` and `text-sm`
  carry **0.01em**, set as `--text-xs--letter-spacing` and
  `--text-sm--letter-spacing` in the `@theme` block so every small string in
  the product inherits it; never add `tracking-*` to a component to get this.
  Larger sizes stay at zero, and display type goes the other way (the home
  headline is `tracking-tight`).
- Page title: `text-2xl font-semibold`; subtitle `text-base text-muted-foreground mt-1.5`.
- Section/tab labels: `text-sm font-medium`; card titles `text-base font-medium`
  or `text-lg font-semibold` for prominent panels.
- Meta text (timestamps, group labels, chips): `text-xs` muted.

## 4. Radii

Base `--radius: 0.375rem` (6px). **Every corner in the app sits between 4px and
6px**; the token scale enforces it (`sm` 4px, `md` 5px, `lg` and everything
above clamped to 6px), so `rounded-xl` and larger render at 6px too.

- Buttons, inputs, selects, tooltips, nav menu items: `rounded-lg` (6px).
- Cards, sidebar card, main content card, dialogs, toasts: `rounded-xl`
  (renders 6px via the clamp; keep the class for semantic grouping).
- Count badges, checkboxes, segmented controls, small/xs buttons:
  `rounded-md` (5px).
- Kbd chips and the tightest details: `rounded-sm` (4px).
- Never write a raw `rounded-[Npx]`; always go through the scale so the
  4-to-6px rule holds everywhere at once.
- Only exceptions: true circles (avatars, FAB, status dots) stay `rounded-full`,
  and the two layout shell cards (the conversation and the docked configure
  panel, plus the content card on every other route) use `rounded-shell` (8px).
  Those are the largest surfaces on screen, where a 6px corner reads as almost
  square. It is a named token so it stays countable; do not reach for it on
  anything that sits inside a card.
- Tooltips: dark ink bubble: `bg-foreground text-background rounded-lg px-3 py-2 text-sm font-medium`.

## 5. Spacing & layout

- Sidebar width **15rem (240px)**; card gutter `p-2` (8px) around both cards.
- Sidebar inner padding `p-2`; nav item height **36px** (`h-9`), icon 16px, `gap-2`.
- Nav groups separated by spacing + occasional `SidebarSeparator`; group labels 12px.
- Main content padding `p-6 md:p-8`; title block ~32px from card top.
- One column, `max-w-thread` (38.4rem), on every standard page, via
  `PageShell`. There is no wide variant; see 7a.
- List rows are ~52 to 60px tall with 1px `--border` dividers between them.

### 5b. Mobile (below `md`, 768px)

The breakpoint scale is written out in `globals.css` `@theme`
(`--breakpoint-*`); the app splits on ONE line: **mobile = below `md`**,
matching the sidebar's own `isMobile`. Tablets get the desktop layout; `lg`
exists only for the chat's docked config panel. Rules on mobile:

- **Full-bleed surfaces.** The card-inset chrome is `md:`-only; below it the
  canvas is the card: no radius, no outer margins. Content keeps a `px-4`
  (16px) gutter.
- **Fluid widths only.** Containers are `w-full` / percentages; fixed pixel
  widths are a desktop concept. Nothing scrolls horizontally except code.
- **Tap floor 44px.** Interactive controls are `size-11` / `min-h-11` on
  mobile (`md:` resets to the desktop size). Icon buttons are the usual
  offenders; row-shaped targets may pair a shorter visual with an expanded
  hit area (`after:absolute after:-inset-*`).
- **Input text is 16px (`text-base`) on mobile.** Below 16px iOS zooms the
  page on focus; one rule for all inputs beats platform-sniffing.
- **Type is a three-tier ladder, each tier one step above the last, on both
  viewports.** Every tier is `--text-*` variable overrides (the
  variable-override trick from `.run-chat-type`, promoted); never bulk-edit
  utility classes to resize a surface.

  | Surface (scope class)            | Desktop body | Mobile body |
  |----------------------------------|--------------|-------------|
  | App (`:root`, max-md block)      | 14px         | 15px        |
  | Chat (`.run-chat-type`)          | 15px         | 16px        |
  | Configure (`.run-config-type`)   | 15px (chat)  | 17px        |

  All three live together in `globals.css`: the mobile app scale in the
  `@media` block under `@theme`, the chat and Configure mobile lifts inside
  the `.run-chat-type` utilities block. The rule that keeps it sane: a
  surface's scale is defined in exactly one place, and a new surface that
  needs its own size gets a scope class and a variable block, nothing else.
- **Full-screen takeovers**: below `md`, the Configure panel and the Usage
  dialog become the whole screen (`inset-0`, `h-svh`, `max-w-none`,
  `rounded-none`, safe-area bottom padding, and for dialogs the centering
  transform reset to zero so `inset-0` can take over). A floating desktop
  card at phone width is the smell this replaces.
- **Hover cards on touch**: the trigger's tap must do something sensible:
  the composer ring toggles its card on click; the sidebar meter's tap goes
  straight to the history dialog. Focus/blur keep both keyboard-reachable.
- **Nothing operable only by hover.** Hover cards get a tap equivalent or a
  better touch behavior (the meter goes straight to its dialog); every
  tooltip-bearing control must make sense bare, because tooltips do not
  exist on touch.
- **Bottom-pinned bars pad the safe area**:
  `pb-[env(safe-area-inset-bottom)]` (the composer, full-screen sheets).
- **The mobile top bar** (`md:hidden`, in the dashboard layout) is the one
  mobile-only component: sidebar trigger at `size-11`, the mark, the
  wordmark, `h-12`, hairline bottom border, sticky.

## 6. Iconography

- **Monochrome outline icons only** (lucide-react), `currentColor`, 1.75px stroke
  (`stroke-[1.75]`), 18px (`size-4.5`) in nav, 16px (`size-4`) in dense contexts like
  tables. No multi-color/filled illustration icons.
- Icons inherit text color: ink in nav, muted in secondary contexts.
- App nav icons live in `components/nav-icons.tsx` as re-exported lucide icons;
  swap there, never inline new icon styles in pages.
- **Exception, connector logos:** third-party integrations (Google Drive, etc.)
  show their official multicolor product mark, inlined as an SVG component in
  `components/icons/`. Users recognise services by their real logo; never
  substitute a generic monochrome stand-in for a named connector, and never
  use brand marks for anything that is not that brand's connector.

## 7. Component recipes

### 7a. Page containers (the shape every standard page uses)

Settled with the founder on a canvas, 2026-08-21, and implemented as
`components/section-card.tsx`. It replaces four different answers to the same
question that had grown across Connectors, Routines, Knowledge and the run
history. Use these components rather than re-deriving the classes.

- **A page is a stack of cards.** `SectionCard` = `rounded-xl border
  border-border bg-card p-5`, laid out `flex flex-col gap-3.5`, and the page
  stacks them with `gap-5`. Never the shadcn `Card` primitive on a page: it
  draws `ring-1 ring-foreground/10` rather than our border token, which is why
  Settings used to be the only page outlined differently.
- **The card carries one heading and nothing else in words.** `text-base
  font-medium`, one step below the page title, which stays the loudest voice,
  plus an optional action at the trailing edge of that line. A count beside
  the heading is `SectionCount`: `text-sm font-normal text-muted-foreground`.
  There is no description line and no footnote, and `SectionCard` has no prop
  for either (founder call 2026-08-23). Every card used to explain itself
  under its heading and read down a page it was a wall of prose nobody needed
  twice. What has to be said belongs to the row it is about, or to the page
  subtitle, or it is not worth saying.
- **A card that holds a list puts it in a bordered box.** `RowBox` =
  `divide-y divide-border overflow-hidden rounded-lg border border-border`,
  one radius step down from the card. Hairlines only: a gap turns every row
  back into a card, a vertical rule turns the box into a table. Pass `list`
  when the rows are `<li>`.
- **Rows are one shape.** `Row` = `flex items-center gap-3 px-3.5 py-3`, an
  optional `RowTile` lead (`size-9 rounded-md border border-border
  bg-background`), the name `text-sm font-medium`, a `text-xs` muted detail
  that WRAPS rather than truncates, and everything actionable gathered at the
  trailing edge. A row whose detail is data rather than prose passes its own
  truncating node. Pass `item` for a row inside a `RowBox list` and it renders
  as the `<li>` that box wants: the pages that hand-rolled their own `<li>`
  because `Row` was a `<div>` all drifted from this recipe within a week.
- **A row's facts go on the detail line, not in the middle of the row.**
  Kind, size, when it changed: one `text-xs` line, separated by middle dots
  (`·` at `text-muted-foreground/50`), read left to right. A third column
  floated between the name and the trailing edge lands in a different place on
  every row and leaves a ragged gap; that was Knowledge's agent chips before
  2026-08-25. State that belongs to the row and lines up down the list (a meta
  chip, a status word) goes at the trailing edge with the kebab. Below `sm`,
  where a 326px row has no width to give, the chip stands down and its words
  join the detail line.
- **Empty fills the box's slot, not the card's.** `EmptyBox`, or the dashed
  box recipe in 7b, inside the same `SectionCard` the rows would have used, so the
  page keeps its shape when there is nothing in it yet.
- **A form is the exception.** A section of inputs keeps its fields on the
  card with no inner box: a hairline between two inputs reads as a table of
  inputs. Settings is the only page where this applies.
- **One width.** Every standard page is the `max-w-thread` column via
  `PageShell`. The old `wide` escape hatch for Routines is gone.

### 7b. The parts that go inside

- **Primary button** ("Create"): `bg-primary text-primary-foreground rounded-lg h-8/h-9`,
  hover slightly lighter (`/80` handled by the button variant).
- **Outline button** (Filter, sidebar Create): white bg, `border-border`, ink text,
  `rounded-lg`; hover `bg-muted`.
- **Search input:** `h-8/h-9 rounded-lg border-input` with leading muted magnifier icon.
- **Nav item:** `h-9 rounded-lg px-2.5 gap-2.5`, items spaced `gap-0.5`. Two distinct
  states: hover = soft wash `bg-sidebar-accent/60`; active = full `bg-sidebar-accent`
  + `font-medium`. Sub-items: `h-8`, same pill states, indented behind a 1px left rail.
  Count badge: `chart-2` blue text on a pale blue tint, `h-5 min-w-5 rounded-md text-xs`.
- **Empty states are dashed boxes.** Never a floating sentence. Two sizes.
  FULL, for a page or a dialog: `rounded-lg border border-dashed border-border`
  inside the SectionCard the content would have filled, centred, `py-12`, with
  a `size-11 rounded-lg border border-border bg-background` tile, a `size-5`
  muted icon, a `text-base font-medium` headline and one `text-sm` muted line
  saying how to fill it. COMPACT, for the sidebar and docked panels:
  `rounded-lg border border-dashed border-border px-2.5 py-2 text-xs
  text-muted-foreground`, one line, no icon. Body copy carries the action
  only; what the thing IS is already the card's heading. Loading and
  empty share one box at one height so the surface holds its shape.
- **Drop zones are dashed boxes that are real buttons** (same language as an
  empty state; the zone IS the empty state, never stacked beside one). The
  button doubles as click-to-browse and keyboard access, drops feed the same
  handler as the picker, and the size keeps a non-breaking space
  ("15&nbsp;MB").
- **Row overflow menu:** a row's actions live in a kebab at its trailing edge
  (`Ellipsis`, ghost `icon-sm`, `text-muted-foreground`) opening a
  `DropdownMenu`: the ordinary actions first, then a separator and the
  destructive one (`variant="destructive"`) always last. The menu sizes to its
  own content, never to its anchor (`min-w-[max(8rem,var(--anchor-width))]` on
  `DropdownMenuContent`): anchored to a 32px kebab, an exact anchor width wrapped
  "Use only where attached" onto two lines. While a row action is running, the
  spinner takes the icon's place INSIDE the same button rather than replacing
  it, so the row does not resize under the pointer. Quick actions may
  also appear on hover beside it (`hidden md:group-hover:flex`), never
  instead of the menu, because hover does not exist on touch.
- **One record, opened: a Dialog.** For a record's details without leaving
  the list it came from (a routine, a knowledge source). This used to say
  "side drawer (Sheet)"; the app has never had one on a page, because the
  founder chose the centred dialog after seeing both. `gap-0 overflow-hidden
  p-0`, a `border-b` header with `pr-12` to clear the X, a scrollable `flex-1
  overflow-y-auto p-5` body, and full screen below `md` (see 5b). Body lists
  and fact tables are the 7a `RowBox`. Keep the selected record in state after
  close (a separate `open` boolean drives visibility) so the overlay keeps its
  content through the exit animation instead of flashing empty, and key the
  body on the record's id so it remounts rather than syncing props into state.
- **The row is the door.** A list row whose record has more to it than fits on
  two lines opens the record on click (`cursor-pointer hover:bg-muted/40`), and
  the trailing cluster stops the click from reaching it
  (`onClick={(e) => e.stopPropagation()}`) so the kebab is not also a door.
- **Cards IN the conversation** (approval, review, options, routine) are the
  one place a card is outlined in the focus green rather than the border
  token: `rounded-xl border border-ring/60 bg-card p-4`. They are asking for
  a decision, and the green says so. Never use it for a page section.
- **Dialog:** the usage history is the pattern. Its sections are a
  `text-sm font-medium` label over a 7a box, not cards: a card inside a dialog
  is a box in a box. Below `md` it takes the whole screen (see 5b).
- **Rich hover cards are hand-rolled, not tooltips** (the tooltip primitive is
  a dark one-line chip). Relative wrapper, mouseenter state, absolute card,
  fully opaque `bg-card` with `shadow-md`: an alpha tint turns a floating card
  into glass. Anchor from the edge nearest the container's edge so it opens
  inward, and make the WHOLE card the click target if anything on it is
  clickable. A card hanging off something INLINE is portalled to the body
  instead, positioned against the viewport, and closes on scroll and resize
  (`components/chat/source-chip.tsx`).
- **Status is one icon, and colour carries the state.** Beside the thing's
  name: the same `Check`, `text-primary` when on, `text-muted-foreground/40`
  when off, the word in the tooltip and in the aria-label. A different icon
  per state (dashed circle, X) reads as an error; the founder rejected it. In
  a history list, status speaks only for the exception: ordinary rows carry
  nothing, failures carry one quiet chip.
- **Meta chips:** `flex h-6 items-center gap-1.5 rounded-md border
  border-border bg-background px-2 text-xs text-muted-foreground` with 12px
  icons (`[&_svg]:size-3`). A chip that must shout (a failure) swaps the
  border for a tint: `rounded-md bg-destructive/10 px-2 py-0.5 text-xs
  font-medium text-destructive`, or `bg-chart-4/15 text-chart-4` for a warning.
- **Meters and progress tracks:** track `bg-border` (never `bg-muted`, which
  is within a shade of the card and reads as empty), fill `bg-foreground/70`,
  escalating to `bg-chart-4` at 80% and `bg-destructive` at 95%. Height `h-1`
  for a row-level meter, `h-1.5` inside a card.
- **Composer action row:** every control gathers at the trailing edge (meter
  ring, paperclip, send). The attach icon is `Paperclip`.

## 8. Do / Don't

- Do build a page out of `SectionCard` and `RowBox` (7a) rather than a new
  arrangement of borders. Four arrangements is what we had, and unpicking it
  took a day.
- Do keep green rare: one primary action per screen, plus status accents.
- Do use the `--sidebar` canvas with white cards for any new full-screen layout.
- Don't reintroduce coloured or filled icons, cold grey neutrals, raw
  `rounded-[Npx]` values, or any corner outside the 4 to 6px range (circles
  excepted).
- Don't restyle ad hoc in a page; change the token here and in `globals.css`
  so it lands everywhere at once.
- Don't leave a recipe in this file that no code follows. If a rule here and
  the app disagree, one of them is a bug and the disagreement is the finding:
  fix whichever is wrong in the same pass, and never quietly work around it.
