import { notFound } from 'next/navigation'

import type { ApprovalCall } from '@/components/chat/approval-card'
import { ChatHeader } from '@/components/chat/chat-header'
import { ConfigDock } from '@/components/chat/config-dock'
import { type ArtifactMeta } from '@/components/chat/artifact-card'
import {
  ChatThread,
  type AttachmentMeta,
  type ChatMessage,
} from '@/components/chat/chat-thread'
import { isAskTool, summarizeAsk, summarizeWrite } from '@/lib/tools/definitions'
import { getUserProfile } from '@/lib/auth'
import { parseSetupAnswers, stripBrief } from '@/lib/chat/onboarding'
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

  // Everything that depends only on the ids we already hold, in one round trip
  // rather than four sequential ones. None of these reads needs the result of
  // any other, so the previous chain of awaits was costing the sum of their
  // latencies for no reason.
  //
  // The thread is read rather than upserted here. The upsert below uses
  // ignoreDuplicates, which returns nothing when the row already exists, so it
  // always needed a second query to learn the id. Reading first inverts that:
  // after the first visit, which is almost every visit, this is the only query
  // the thread costs.
  const [{ data: agent }, { data: existingThread }] = await Promise.all([
    supabase
      .from('agents')
      .select(
        'id, name, onboarded, system_prompt, preferences, model, personality, owner_id'
      )
      .eq('id', agentId)
      .single(),
    supabase
      .from('threads')
      .select('id, pending_tools, pending_attachment')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  // Checked before anything below reads the results above. A thread cannot
  // exist for an agent the user does not own (RLS gates the insert on
  // ownership), so a missing agent means there is nothing here to show.
  if (!agent) notFound()

  // Panel fields that come free with the agent row we already read for the
  // header. The panel's expensive data (connectors and knowledge) is not here:
  // it loads when the panel opens, via /api/agents/[agentId]/config.
  const instructions = stripBrief(agent.system_prompt)
  const preferences = parseSetupAnswers(agent.preferences)

  // First visit only: create the one-per-user thread, which also covers agents
  // made before threads existed. Every later visit already has it from the
  // batch above and skips this entirely.
  let thread = existingThread
  if (!thread) {
    await supabase
      .from('threads')
      .upsert(
        { agent_id: agent.id, user_id: userId },
        { onConflict: 'agent_id,user_id', ignoreDuplicates: true }
      )
    const { data: created } = await supabase
      .from('threads')
      .select('id, pending_tools, pending_attachment')
      .eq('agent_id', agent.id)
      .eq('user_id', userId)
      .single()
    thread = created
  }

  const { data: rows } = await supabase
    .from('messages')
    .select('id, role, content, attachments, payload, created_at')
    .eq('thread_id', thread!.id)
    .order('id')

  const initialMessages: ChatMessage[] = (rows ?? []).map((r) => {
    const artifact = (r.payload as { artifact?: ArtifactMeta } | null)?.artifact
    return {
      id: r.id,
      role: r.role,
      content: r.content,
      createdAt: r.created_at ?? undefined,
      attachments: (r.attachments as AttachmentMeta[] | null) ?? undefined,
      artifact: artifact ?? undefined,
    }
  })

  // A file attached but not yet sent survives a reload: restore its chip in the
  // composer (metadata only; the extracted text stays server-side).
  const pa = thread!.pending_attachment as
    | {
        name: string
        type: string
        size: number
        kind?: 'document' | 'image'
        thumb?: string
      }
    | null
  const initialAttachment: AttachmentMeta | null = pa
    ? { name: pa.name, type: pa.type, size: pa.size, kind: pa.kind, thumb: pa.thumb }
    : null

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
    <ConfigDock
      header={
        <ChatHeader
          key={`${agent.id}:${agent.name}`}
          agentId={agent.id}
          agentName={agent.name}
        />
      }
      panel={{
        agentId: agent.id,
        agentName: agent.name,
        instructions,
        model: agent.model,
        personality: agent.personality,
        preferences,
        isOwner: agent.owner_id === userId,
      }}
    >
      <ChatThread
        agentId={agent.id}
        agentName={agent.name}
        initialMessages={initialMessages}
        initialApproval={initialApproval}
        onboarding={!agent.onboarded}
        initialAsk={initialAsk}
        initialAttachment={initialAttachment}
      />
    </ConfigDock>
  )
}
