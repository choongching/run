import { notFound } from 'next/navigation'

import type { ApprovalCall } from '@/components/chat/approval-card'
import { ChatHeader } from '@/components/chat/chat-header'
import { ChatThread, type ChatMessage } from '@/components/chat/chat-thread'
import { summarizeWrite } from '@/lib/tools/definitions'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

// The live chat surface (Phase 2): loads the thread's history and hands it to
// the client thread, which streams new turns through the run loop.
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
    .select('id, name')
    .eq('id', agentId)
    .single()

  if (!agent) notFound()

  // Ensure the one-per-user thread exists (idempotent for agents created
  // before threads), then read its id.
  await supabase
    .from('threads')
    .upsert(
      { agent_id: agent.id, user_id: userId },
      { onConflict: 'agent_id,user_id', ignoreDuplicates: true }
    )
  const { data: thread } = await supabase
    .from('threads')
    .select('id, pending_tools')
    .eq('agent_id', agent.id)
    .eq('user_id', userId)
    .single()

  const { data: rows } = await supabase
    .from('messages')
    .select('id, role, content')
    .eq('thread_id', thread!.id)
    .order('id')

  const initialMessages: ChatMessage[] = (rows ?? []).map((r) => ({
    id: r.id,
    role: r.role,
    content: r.content,
  }))

  // A write awaiting approval survives a reload: rebuild the card from the
  // thread's stored pending call(s).
  const pending = thread!.pending_tools as
    | { id: string; name: string; input: Record<string, unknown> }[]
    | null
  const initialApproval: ApprovalCall[] | null = pending
    ? pending.map((c) => ({ id: c.id, ...summarizeWrite(c.name, c.input) }))
    : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mx-auto w-full max-w-3xl shrink-0 border-b border-border pb-3">
        <ChatHeader key={agent.id} agentId={agent.id} agentName={agent.name} />
      </header>
      <ChatThread
        agentId={agent.id}
        agentName={agent.name}
        initialMessages={initialMessages}
        initialApproval={initialApproval}
      />
    </div>
  )
}
