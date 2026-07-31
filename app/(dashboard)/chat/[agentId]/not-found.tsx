import Link from 'next/link'

import { AgentsIcon } from '@/components/nav-icons'

// Rendered when the chat's agent does not exist: a deleted agent, an old
// link, someone else's id. Without this file the notFound() in page.tsx
// rendered nothing at all inside the shell, which read as the app breaking.
// The person always gets told what happened and given a way out.
export default function AgentNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-background">
          <AgentsIcon className="size-5 text-muted-foreground" />
        </div>
        <p className="text-base font-medium">This agent is gone</p>
        <p className="text-sm text-muted-foreground">
          It was deleted, or the link is old. Your other agents are safe in
          the sidebar.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Build a new one
        </Link>
      </div>
    </div>
  )
}
