import { notFound } from 'next/navigation'

import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

// The chat surface. Phase 1 renders the thread shell (header + empty
// conversation + placeholder composer) and guarantees a thread exists;
// Phase 2 makes it live with assistant-ui and the run loop.
export default async function ChatPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  const { userId } = await getUserProfile()
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, description')
    .eq('id', agentId)
    .single()

  if (!agent) notFound()

  // Ensure the one-per-user thread exists so the agent is chat-ready. The
  // unique index makes this idempotent for agents created before threads.
  await supabase
    .from('threads')
    .upsert(
      { agent_id: agent.id, user_id: userId },
      { onConflict: 'agent_id,user_id', ignoreDuplicates: true }
    )

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <header className="border-b border-border pb-4">
        <h1 className="text-lg font-semibold">{agent.name}</h1>
        {agent.description && (
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {agent.description}
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Your conversation with {agent.name} will appear here.
        </p>
      </div>

      <div className="rounded-xl border border-input bg-card px-4 py-3 shadow-xs">
        <p className="text-sm text-muted-foreground">
          Chat is coming in the next step.
        </p>
      </div>
    </div>
  )
}
