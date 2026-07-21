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

- **Family:** Inter (`--font-sans`), Geist Mono for code. No serif anywhere.
- **`text-sm` is retuned to 15px/1.4rem** in globals.css — the reference runs body and
  menu type slightly larger than Tailwind's 14px default. Use `text-sm` as the body size.
- Page title: `text-3xl font-bold tracking-tight` (~30px) — e.g. "Campaigns".
- Page subtitle: `text-base text-muted-foreground`, `mt-2` under the title.
- Section/tab labels: `text-sm font-medium`; card titles `text-lg font-semibold`.
- Table header: `text-sm font-semibold` in full ink (not muted).
- Body, nav items, table cells: `text-sm` (15px); nav items `font-medium` when active.
- Meta text (timestamps, group labels): `text-sm` muted or `text-xs` (group labels).

## 4. Radii

Base `--radius: 0.75rem` (12px) — the reference is noticeably round.

- Buttons, inputs, tooltips: `rounded-lg` (12px).
- Cards, sidebar card, main content card, toasts: `rounded-xl` (~17px).
- Nav menu items (buttons, sub-buttons, row actions): exactly **8px** (`rounded-[8px]`) —
  anything rounder reads as a pill on 36px rows.
- Count badges, checkboxes, segmented controls: `rounded-md` (~10px).
- Avatars and FAB: `rounded-full`.
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
  2px green underline.
- **Table:** semibold ink header row, hover row wash `bg-muted/50`, green checkboxes,
  kebab (`⋮`) as `icon-sm` ghost/outline button, circular initial avatars in chart colors.
- **Selection toast:** centered bottom `bg-card rounded-xl border shadow-lg px-4 py-3`.
- **FAB:** fixed bottom-right `size-13 rounded-full bg-primary text-primary-foreground shadow-lg`.

## 8. Do / Don't

- Do keep green rare: one primary action per screen + status accents.
- Do use `--sidebar` canvas + white cards for any new full-screen layout.
- Don't reintroduce colored/filled icons, pure-gray-cold neutrals, or radii above
  `rounded-xl` (except circles).
- Don't restyle ad-hoc in pages — change tokens here + `globals.css` so it applies
  everywhere.
