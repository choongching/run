# Run

Run is a single-company web dashboard where admins configure AI agents and
employees brief them to get work done, with outputs saved as Google Docs,
Google Sheets, or PDFs.

Built with Next.js 16, React 19, Tailwind CSS v4, Supabase (auth + database),
and the Anthropic API.

## Project progress

**Current status:** All five roadmap phases are complete and merged to
`main`. The app is feature-complete for v1 and ready to deploy (see
Deploying below).

The full, detailed history of what has been done, session by session and in
plain English, lives in **[PROGRESS.md](./PROGRESS.md)**. It is updated at the
end of every work session, so it always reflects exactly where the project
left off.

Done so far, at a glance:

- ✅ **Phase 1, foundation and app shell:** Supabase email/password auth,
  admin/user roles, protected routes, and the full sidebar/dashboard shell with
  placeholder pages for every section.
- ✅ **Visual restyle:** the whole app follows a token-driven design system
  (warm canvas, floating white cards, forest-green accents, Lucide icons),
  documented in [docs/styleguide.md](./docs/styleguide.md).
- ✅ **Phase 2, admin configuration:** company settings, agent
  create/edit/archive with Claude Managed Agents dual-write, AI-assisted prompt
  writing, and assigning agents to users.
- ✅ **Phase 3, Google Drive and knowledge:** org-level Drive connection via
  Pipedream Connect, per-agent knowledge files picked from Drive, and
  server-side text extraction for Docs, Sheets, DOCX, PDF, TXT, and CSV.
- ✅ **Phase 4, missions and agent runs:** the Missions Kanban, mission runs
  through Claude Managed Agents Sessions with mounted knowledge, Google
  Doc/Sheet/PDF outputs saved to Drive, and the My Squad sidebar with
  per-agent personal instructions.
- ✅ **Phase 5, usage and hardening:** token and cost tracking per mission
  run and prompt generation, the role-aware Usage page, profile settings
  with avatar upload, and the production hardening pass (403 sweep,
  secret-leak scan, deployment docs).

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in your own Supabase and
Anthropic keys, then open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript
npm run build      # production build
```

## Deploying

The app is a standard Next.js project and deploys cleanly to Vercel:

1. **Supabase:** create a project and apply every migration in
   `supabase/migrations/` in filename order (SQL editor or CLI). Turn email
   confirmation on or off to taste under Auth settings.
2. **Vercel:** import the repo and set the environment variables from
   `.env.local.example`. `NEXT_PUBLIC_APP_URL` must be the deployed URL
   (it is used for the Google Drive OAuth redirect).
3. **Pipedream:** set `PIPEDREAM_ENVIRONMENT=production` and make sure the
   Pipedream project has a production environment configured in its
   dashboard, then reconnect Google Drive once from Admin > Integrations.
4. **First run:** sign up (the first account can be promoted to admin by
   setting `profiles.role = 'admin'` in Supabase), create the agent runtime
   under Admin > Integrations, connect Google Drive, create an agent, and
   run a mission.

Mission runs are synchronous and can take a few minutes; the run route sets
`maxDuration = 300`, which needs a Vercel plan that allows 300-second
function durations (or lower the value and keep briefs small).
