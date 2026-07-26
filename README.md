# Run

Run is a simple AI agent builder. You describe what you want in plain language,
Run builds you an agent, and you work with it by chatting. The agent connects to
your own Gmail and Google Drive and does real work for you: summarizing your
inbox, drafting replies, finding and reading your files. It reads freely but
always asks before it writes or sends anything.

The whole idea is that building an agent and using it are the same thing: a
conversation. There is no form to fill in and no workflow to wire up. You tell
your agent what you need, it configures itself from what you say, and it asks
for the access it needs only when it needs it.

## How it works

1. **Describe it.** On the home screen, say what you want ("Summarize my inbox
   each morning and flag anything that needs a reply"). Run creates an agent and
   drops you straight into a chat with it.
2. **Connect your tools.** When the agent needs your Gmail or Drive, a Connect
   button appears right in the chat. You sign in once and it is ready. Every
   person connects their own accounts.
3. **Work together.** The agent streams its thinking and progress as it works,
   and pauses for your approval before anything that sends or changes something
   (like a draft email), showing you a full preview first.
4. **Come back to it.** Your agents live in the sidebar as ongoing chats. Open
   one any time to pick up where you left off; it remembers the conversation.

## Built with

Next.js 16, React 19, and Tailwind CSS v4 on the front end. Supabase for auth,
the database, and row-level security. The Anthropic API (Managed Agents
sessions) runs the agents, and Pipedream Connect handles the per-user Gmail and
Drive connections. The design system is documented in
[docs/styleguide.md](./docs/styleguide.md).

## Project status

Run is a prompt-first personal agent builder. In place today: the prompt-first
home and chat shell, the live streaming chat loop, per-user Gmail and Drive
connections, read tools (search and read your inbox and Drive) with writes gated
behind an in-chat approval, an in-chat Configure panel (name, instructions,
model, personality, and connections), agents that stay on task, a safety floor
against instructions hidden in the content an agent reads, and file upload so an
agent can read a document you attach to a message.

The older admin-configured screens that this direction replaced have now been
removed, so the app is one product end to end. Still to come: scheduled runs, so
an agent can work on its own, for example a daily inbox summary that arrives
without you asking.

The full, plain-English history, session by session, lives in
**[PROGRESS.md](./PROGRESS.md)**, updated at the end of every work session.

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in your own Supabase,
Anthropic, and Pipedream keys, then open
[http://localhost:3000](http://localhost:3000).

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
   `.env.local.example`. `NEXT_PUBLIC_APP_URL` must be the deployed URL (it is
   used for the OAuth redirects).
3. **Pipedream:** set `PIPEDREAM_ENVIRONMENT=production` and make sure the
   Pipedream project has a production environment with the Gmail and
   Google Drive apps enabled.
4. **First run:** sign up. The first account can be promoted to admin by setting
   `profiles.role = 'admin'` in Supabase, which unlocks the one-time setup of
   the shared agent runtime (the Anthropic environment). After that, anyone can
   create an agent from the home screen, connect their own Gmail or Drive when
   the agent asks, and start chatting.

Chat turns run synchronously and a tool-using turn can take a little while; the
chat route sets `maxDuration = 300`, which needs a Vercel plan that allows
300-second function durations.
