# Run Progress Log

A running, plain-English record of what has been done on this project, so anyone
(including future us) can open this file and know exactly where we left off.

**How this file works:** every work session ends by adding a new dated entry at the
top of the log below, written point by point. Never delete old entries, this is
the project's history. This file is public; never write secrets, passwords, API
keys, or internal-only plans in here.

**Where we left off:** Phase 4 (the Missions board with real agent runs) is
built and verified live on the `phase-4` branch, together with a redesigned
Users page (squad chips in the table, side-drawer assignment). Missions run
through Claude Managed Agents Sessions with knowledge files mounted, and
outputs land in Google Drive as real Docs and Sheets. Next up: review and
merge `phase-4`, then Phase 5 (usage tracking, profiles, production
hardening).

---

## 2026-07-24: Phase 4, the Missions board with real agent runs

- New `missions` table (migration 010) with status and output-type enums,
  owner-scoped row security (admins can read all missions but the board is
  always personal), plus a column for the shared Claude runtime environment.
- One-time runtime setup: an "Agent runtime" card on Admin > Integrations
  creates the Claude cloud environment with one click and shows its ID once
  ready. All mission sessions run inside this shared environment.
- The mission run pipeline, verified with three real live runs:
  - Each pinned knowledge file is extracted to text, uploaded, and mounted
    into the session container; the agent is told the real mounted paths.
    In the live test the agent correctly cited one of the ten mounted files.
  - Company context and the user's personal agent instructions are folded
    into every kickoff message. Verified live: a "Prepared by Run" sign-off
    instruction saved in the drawer appeared as the final row of a
    generated spreadsheet.
  - Outputs: Google Doc, Google Sheet, PDF (a Doc served via Drive's PDF
    export link), or plain text. Docs and Sheets are created through
    Drive's upload-with-conversion endpoint because the Pipedream proxy
    only allows the Drive API domain, so the spec's Docs/Sheets write APIs
    could not be used. The mechanism was proven with a live probe first.
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
