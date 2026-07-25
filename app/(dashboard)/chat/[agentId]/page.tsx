import { notFound } from 'next/navigation'

import type { ApprovalCall } from '@/components/chat/approval-card'
import { ChatHeader } from '@/components/chat/chat-header'
import { ConfigPanel } from '@/components/chat/config-panel'
import { ChatThread, type ChatMessage } from '@/components/chat/chat-thread'
import { isAskTool, summarizeAsk, summarizeWrite } from '@/lib/tools/definitions'
import { getUserProfile } from '@/lib/auth'
import { parseSetupAnswers, stripBrief } from '@/lib/chat/onboarding'
import { getUserConnection } from '@/lib/pipedream/connections'
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
    .select('id, name, onboarded, system_prompt, preferences, model')
    .eq('id', agentId)
    .single()

  if (!agent) notFound()

  // Config-panel data: the base instructions (without the appended setup
  // block), the setup answers, and whether the user has connected each app.
  const instructions = stripBrief(agent.system_prompt)
  const preferences = parseSetupAnswers(agent.preferences)
  const [gmailConn, driveConn] = await Promise.all([
    getUserConnection(supabase, userId, 'gmail'),
    getUserConnection(supabase, userId, 'google_drive'),
  ])
  const connections = { gmail: !!gmailConn, google_drive: !!driveConn }

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

  // A pending tool call survives a reload: rebuild its card from the thread's
  // stored call(s). It is either a question (ask_user) or a write awaiting
  // approval; show whichever it is.
  const pending = thread!.pending_tools as
    | { id: string; name: string; input: Record<string, unknown> }[]
    | null
  const askCall = pending?.find((c) => isAskTool(c.name))
  const initialAsk = askCall
    ? { id: askCall.id, ...summarizeAsk(askCall.input) }
    : null
  const initialApproval: ApprovalCall[] | null =
    pending && !askCall
      ? pending.map((c) => ({ id: c.id, ...summarizeWrite(c.name, c.input) }))
      : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
        <ChatHeader
          key={`${agent.id}:${agent.name}`}
          agentId={agent.id}
          agentName={agent.name}
        />
        <ConfigPanel
          key={`config-${agent.id}`}
          agentId={agent.id}
          agentName={agent.name}
          instructions={instructions}
          model={agent.model}
          preferences={preferences}
          connections={connections}
        />
      </header>
      <ChatThread
        agentId={agent.id}
        agentName={agent.name}
        initialMessages={initialMessages}
        initialApproval={initialApproval}
        onboarding={!agent.onboarded}
        initialAsk={initialAsk}
      />
    </div>
  )
}
