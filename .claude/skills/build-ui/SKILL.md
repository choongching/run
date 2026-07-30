---
name: build-ui
description: Build or modify UI in the Run app the styleguide way. Use for any task that creates or changes components, pages, styling, or icons.
---

# Build UI for Run

Follow this procedure whenever creating or changing UI. It encodes the design
system plus every convention already verified the hard way in this codebase.
Goal: zero re-derivation, zero styling drift.

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
  so.
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
  Never a floating sentence. Two sizes: FULL (pages, dialogs) is
  `rounded-xl border border-dashed border-border` with centered icon tile
  (`size-11 rounded-lg border bg-background`, icon `size-5
  text-muted-foreground`), a `font-medium` title one step below the surface's
  heading, and a one-line muted sub; COMPACT (sidebar, docked panels) is
  `rounded-lg border border-dashed border-border px-2.5 py-2 text-xs
  text-muted-foreground`, one line, no icon. In dialogs, loading and empty
  share the same min-height box so the surface holds its shape (see
  `components/usage/usage-meter.tsx`).
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
- **Empty states:** boxed in the same card as content sections (`rounded-xl
  border border-border bg-card`), headline at card-title level (`text-base
  font-medium`, NOT text-xl, one loudest voice per page), then one muted line
  saying how to fill it. In the sidebar, an empty list keeps its group label
  and shows one dashed slot (`border-dashed`, "Your agents will live here")
  rather than disappearing.
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
