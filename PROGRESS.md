# Run Progress Log

A running, plain-English record of what has been done on this project, so anyone
(including future us) can open this file and know exactly where we left off.

**How this file works:** every work session ends by adding a new dated entry at the
top of the log below, written point by point. Never delete old entries, this is
the project's history. This file is public; never write secrets, passwords, API
keys, or internal-only plans in here.

**Where we left off:** Phase 1 is fully complete and merged to `main`. A fresh
`phase-2` branch has been created for the next stage of work (admin configuration).
No Phase 2 code has been written yet.

---

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
