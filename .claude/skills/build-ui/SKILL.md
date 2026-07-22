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
  600 for titles, 700 rare.
- **CSS overrides:** Tailwind v4 cascade layers mean the utilities layer beats
  `@layer components` regardless of selector specificity. Any custom rule that
  must override a utility-classed element goes in `@layer utilities` in
  `globals.css` (see the existing sidebar shell override there as the pattern).
- **Dark mode:** every new token or color decision must be mirrored in the
  `.dark` block in `globals.css`.
- **Sidebar shell:** `variant="inset"`; sidebar width token is 15rem. Do not
  restyle the shell per page.

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
