import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { getAnthropicClient } from '@/lib/anthropic/client'

const GENERATION_MODEL = 'claude-sonnet-5'

export async function POST(request: Request) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json().catch(() => null)
  const role = typeof body?.role === 'string' ? body.role.trim() : ''
  const tasks = typeof body?.tasks === 'string' ? body.tasks.trim() : ''
  if (!role || !tasks) {
    return NextResponse.json({ error: 'role and tasks are required' }, { status: 400 })
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_context')
    .limit(1)
    .single()
  const companyContext = settings?.company_context?.trim() || null

  // Company context is injected verbatim, never paraphrased, so brand
  // guidelines survive intact in the generated prompt.
  const metaPrompt = [
    'Write a system prompt for an AI agent that will work inside a company.',
    '',
    `The agent's role: ${role}`,
    '',
    `The agent's typical tasks:\n${tasks}`,
    companyContext
      ? `\nCompany context, to be reflected faithfully in the prompt (do not alter or summarize the facts in it):\n<company_context>\n${companyContext}\n</company_context>`
      : '',
    '',
    'Requirements for the system prompt you write:',
    '- Second person ("You are ..."), markdown formatted.',
    '- Sections: role and objective, how to work, tone and style, output expectations.',
    '- Concrete and actionable; no filler or generic AI-assistant boilerplate.',
    '- If company context was provided, weave its guidelines into the relevant sections.',
    '',
    'Return ONLY the system prompt markdown, no preamble or explanation.',
  ].join('\n')

  try {
    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: metaPrompt }],
    })
    const systemPrompt = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    return NextResponse.json({ system_prompt: systemPrompt })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Prompt generation failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
