import { notFound } from 'next/navigation'

import type { ApprovalCall } from '@/components/chat/approval-card'
import { ChatHeader } from '@/components/chat/chat-header'
import { ConfigDock } from '@/components/chat/config-dock'
import type { KnowledgeItem } from '@/components/chat/knowledge-section'
import { type ArtifactMeta } from '@/components/chat/artifact-card'
import {
  ChatThread,
  type AttachmentMeta,
  type ChatMessage,
} from '@/components/chat/chat-thread'
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
    .select('id, name, onboarded, system_prompt, preferences, model, personality, owner_id')
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

  // Knowledge: what this agent carries, plus the rest of the user's library so
  // an existing source can be attached to another agent instead of re-uploaded.
  // RLS keeps both lists to sources this user owns.
  const [{ data: attachedRows }, { data: libraryRows }] = await Promise.all([
    supabase
      .from('agent_knowledge')
      .select(
        'created_at, knowledge_sources(id, title, kind, char_count, origin, applies_to_all)'
      )
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true }),
    supabase
      .from('knowledge_sources')
      .select('id, title, kind, char_count, origin, applies_to_all')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const toItem = (s: {
    id: string
    title: string
    kind: 'note' | 'file'
    char_count: number
    origin: unknown
    applies_to_all: boolean
  }): KnowledgeItem => ({
    id: s.id,
    title: s.title,
    kind: s.kind,
    chars: s.char_count,
    truncated: (s.origin as { truncated?: boolean } | null)?.truncated === true,
    appliesToAll: s.applies_to_all,
  })

  // What the agent actually carries is the union of what is attached to it and
  // everything the owner marked as applying to every agent. The panel has to
  // show both or its list and its budget meter would both understate the
  // prompt, and detaching would look broken on a source that is not attached.
  const attached = (attachedRows ?? [])
    .map((r) => r.knowledge_sources)
    .filter((s) => s !== null)
    .map(toItem)
  const attachedIds = new Set(attached.map((s) => s.id))
  const everywhere = (libraryRows ?? [])
    .filter((s) => s.applies_to_all && !attachedIds.has(s.id))
    .map(toItem)

  const knowledge = [...everywhere, ...attached]
  const carriedIds = new Set(knowledge.map((s) => s.id))
  const knowledgeLibrary = (libraryRows ?? [])
    .filter((s) => !carriedIds.has(s.id))
    .map(toItem)

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
    .select('id, pending_tools, pending_attachment')
    .eq('agent_id', agent.id)
    .eq('user_id', userId)
    .single()

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
        connections,
        knowledge,
        knowledgeLibrary,
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
