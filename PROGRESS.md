# Run Progress Log

A running, plain-English record of what has been done on this project, so anyone
(including future us) can open this file and know exactly where we left off.

**How this file works:** every work session ends by adding a new dated entry at the
top of the log below, written point by point. Never delete old entries, this is
the project's history. This file is public; never write secrets, passwords, API
keys, or internal-only plans in here.

**Where we left off:** Phase 2 (admin configuration) is built, fully tested, and
committed on the `phase-2` branch, awaiting review and merge to `main`. Phase 3
(Google Drive integration) has not been started.

---

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
