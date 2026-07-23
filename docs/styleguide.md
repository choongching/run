# Run — Visual Style Guide

Distilled from the reference screenshots (AirOps-style workspace UI). This guide defines
**tokens, type, spacing, radii, and component recipes only** — page content and structure
are out of scope. All values below map to CSS variables in `app/globals.css`; always style
through tokens (`bg-primary`, `text-muted-foreground`, …), never hard-coded hex.

## 1. Overall look

- Warm paper-gray **canvas** with the sidebar and the main content each floating as
  **white rounded cards** (1px border, whisper of shadow, ~8px gutter around them).
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
| `--ring` | green `#3E9668` | focus rings |
| `--chart-1…5` | green, blue, pink, amber, purple | avatars, charts, count badges |
| `--destructive` | red (unchanged) | Move to Trash, errors |

Dark mode mirrors the same relationships on warm charcoal (`.dark` block in globals.css);
primary flips to a lighter green with dark text.

## 3. Typography

Matched to the reference design tokens (Geist-based scale).

- **Family:** Geist (`--font-sans`, variable), Geist Mono for code. No serif.
- **Scale** (Tailwind classes → reference tokens):
  - `text-xs` = caption/label, 12px with a retuned **18px** line-height
    (`--text-xs--line-height` in globals.css).
  - `text-sm` = body-sm, **14px/20px** (Tailwind default; the old 15px retune
    is gone). This is the body size: nav items, table cells, controls.
  - `text-base` = body-md, 16px/24px — page subtitles, prose.
  - `text-xl` = body-xl, 20px — auth-card titles and similar.
  - `text-2xl` = display-xs, **24px/32px** — page titles. Nothing on an app
    page renders larger than 24px.
- **Weights:** 400 body, 500 medium (active nav, labels, chips), 600 semibold
  (page titles, card titles, table headers), 700 reserved for rare emphasis.
- **Letter-spacing:** none at app sizes; negative tracking only at display
  sizes ≥36px, which the app does not use.
- Page title: `text-2xl font-semibold`; subtitle `text-base text-muted-foreground mt-1.5`.
- Section/tab labels: `text-sm font-medium`; card titles `text-base font-medium`
  or `text-lg font-semibold` for prominent panels.
- Table header: `text-sm font-semibold` in full ink (not muted).
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
- Only exception: true circles (avatars, FAB, status dots) stay `rounded-full`.
- Tooltips: dark ink bubble — `bg-foreground text-background rounded-lg px-3 py-2 text-sm font-medium`.

## 5. Spacing & layout

- Sidebar width **15rem (240px)**; card gutter `p-2` (8px) around both cards.
- Sidebar inner padding `p-2`; nav item height **36px** (`h-9`), icon 16px, `gap-2`.
- Nav groups separated by spacing + occasional `SidebarSeparator`; group labels 12px.
- Main content padding `p-6 md:p-8`; title block ~32px from card top.
- Table rows ~52–56px tall with 1px `--border` dividers; generous first column.

## 6. Iconography

- **Monochrome outline icons only** (lucide-react), `currentColor`, 1.75px stroke
  (`stroke-[1.75]`), 18px (`size-4.5`) in nav, 16px (`size-4`) in dense contexts like
  tables. No multi-color/filled illustration icons.
- Icons inherit text color: ink in nav, muted in secondary contexts.
- App nav icons live in `components/nav-icons.tsx` as re-exported lucide icons —
  swap there, never inline new icon styles in pages.
- **Exception, connector logos:** third-party integrations (Google Drive, etc.)
  show their official multicolor product mark, inlined as an SVG component in
  `components/icons/`. Users recognise services by their real logo; never
  substitute a generic monochrome stand-in for a named connector, and never
  use brand marks for anything that is not that brand's connector.

## 7. Component recipes

- **Primary button** ("Create"): `bg-primary text-primary-foreground rounded-lg h-8/h-9`,
  hover slightly lighter (`/80` handled by the button variant).
- **Outline button** (Filter, sidebar Create): white bg, `border-border`, ink text,
  `rounded-lg`; hover `bg-muted`.
- **Search input:** `h-8/h-9 rounded-lg border-input` with leading muted magnifier icon.
- **Nav item:** `h-9 rounded-lg px-2.5 gap-2.5`, items spaced `gap-0.5`. Two distinct
  states: hover = soft wash `bg-sidebar-accent/60`; active = full `bg-sidebar-accent`
  + `font-medium`. Sub-items: `h-8`, same pill states, indented behind a 1px left rail.
  Count badge: `chart-2` blue text on a pale blue tint, `h-5 min-w-5 rounded-md text-xs`.
- **Tabs:** plain text `text-sm font-medium text-muted-foreground`; active = ink text +
  2px green underline (line-variant `TabsList` with `after:bg-primary` on triggers).
- **Detail page anatomy** (a record's own page, e.g. an agent): breadcrumb
  (`Breadcrumb`, parent listing as a link, current name as `BreadcrumbPage`),
  then title row `text-2xl font-semibold` name + status meta chip
  (`AgentStatusChip` pattern), description as the standard subtitle. Below,
  an inner nav row `border-b border-border` splitting the page into section
  tabs (line variant, 16px leading icons via `data-icon="inline-start"`) with
  the primary actions (Save + Cancel, `size="sm"`) pinned right of the same
  row so they stay visible from every tab. One card per tab; narrow forms cap
  at `max-w-3xl`, editors run full width. Sections that need a saved record
  first (e.g. Knowledge on the create page) render as disabled tabs, not
  hidden ones, so the flow stays discoverable.
- **Empty-state hero** (a feature with nothing in it yet, e.g. no connections):
  centered inside the card (`flex flex-col items-center py-14 text-center`).
  Anatomy top to bottom: a cluster of three tilted icon tiles (`size-11/12`
  `rounded-lg border border-border bg-background shadow-xs`, outer tiles
  `-rotate-6`/`rotate-6` and nudged inward, center tile raised and on top,
  monochrome Lucide icons in muted ink); headline `text-xl font-semibold`;
  one friendly sentence of why (`text-sm text-muted-foreground max-w-lg`)
  naming the concrete benefit; a single primary CTA with a trailing
  `ChevronRight`; then a `text-xs` muted caption defusing the scary part
  (what happens next, who has to do it). Never two competing actions.
- **Table:** semibold ink header row, hover row wash `bg-muted/50`, green checkboxes,
  kebab (`⋮`) as `icon-sm` ghost/outline button, circular initial avatars in chart colors.
- **Listing section row** (between page header and a grid/table): count + meta
  + trailing hairline — `flex items-center gap-3`, `text-sm font-medium` count,
  `text-sm text-muted-foreground` meta, then `h-px flex-1 bg-border`. Sort
  listings so working items lead and archived items always sit at the back.
- **Card overflow menu:** actions live in a kebab (`Ellipsis` icon, ghost
  `icon-sm` button, `text-muted-foreground`) in `CardAction`, opening a
  `DropdownMenu` — routine actions first, then a separator and the destructive
  action (`variant="destructive"`) always last. While the menu is open the
  card shows a selected state: `ring-ring/50 shadow-sm`.
- **Meta chips** (card base): `h-6 rounded-md border border-border
  bg-background px-2 text-xs text-muted-foreground` with 12px icons
  (`[&_svg]:size-3`); status chips lead with a `size-1.5 rounded-full` dot in
  a data color (`chart-1` green for active, amber `chart-4` paused, muted for
  archived). Pin the chip row to the card bottom (`mt-auto`).
- **Connector detail modal:** a connected integration card is itself the
  trigger (`role="button"`, hover lift, a `text-xs` "View details" + chevron
  affordance); destructive/config actions live in the modal, not on the card.
  Modal anatomy (`sm:max-w-xl p-6`): header row of logo tile + title + status
  chip; then two line-variant tabs so prose and metadata never share one
  scroll: **Overview** (a lead sentence, then explainer rows in a
  label-left grid `sm:grid-cols-[8.5rem_1fr]`, `text-sm font-medium` label
  and muted `text-sm` body, echoing the metadata rows so both tabs share
  one rhythm) and **Connection** (a metadata `dl` with
  `rounded-lg border divide-y`, rows `min-h-9 px-3 flex justify-between`,
  muted `text-sm` label left, value right, ids in `font-mono text-xs` with a
  ghost `icon-xs` Copy button that toasts on copy, plus a reassuring
  `text-xs` caption). Give both panels a matching `min-h` so switching tabs
  does not resize the modal. Footer holds Disconnect (outline with
  `text-destructive`) + Close, swapping in place to the two-step confirm
  (Keep connected / destructive Confirm) rather than stacking a second
  modal.
- **Selection toast:** centered bottom `bg-card rounded-xl border shadow-lg px-4 py-3`.
- **FAB:** fixed bottom-right `size-13 rounded-full bg-primary text-primary-foreground shadow-lg`.

## 8. Do / Don't

- Do keep green rare: one primary action per screen + status accents.
- Do use `--sidebar` canvas + white cards for any new full-screen layout.
- Don't reintroduce colored/filled icons, pure-gray-cold neutrals, raw
  `rounded-[Npx]` values, or any corner outside the 4-6px range (except circles).
- Don't restyle ad-hoc in pages — change tokens here + `globals.css` so it applies
  everywhere.
