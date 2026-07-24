# Run

Run is a single-company web dashboard where admins configure AI agents and
employees brief them to get work done, with outputs saved as Google Docs,
Google Sheets, or PDFs.

Built with Next.js 16, React 19, Tailwind CSS v4, Supabase (auth + database),
and the Anthropic API.

## Project progress

**Current status:** Phase 4 (the Missions board with real agent runs) is built
and verified live on the `phase-4` branch: missions run through Claude Managed
Agents Sessions with knowledge files mounted, and outputs land in Google Drive.
Awaiting review and merge, then Phase 5.

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
- 🔄 **Phase 4, missions and agent runs (on `phase-4`, pending merge):** the
  Missions Kanban, mission runs through Claude Managed Agents Sessions with
  mounted knowledge, Google Doc/Sheet/PDF outputs saved to Drive, and the
  My Squad sidebar with per-agent personal instructions.
- ⬜ **Phase 5:** usage tracking, profiles, and production hardening.

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
```
