import type { AgentEnabledTools, OutputType } from '@/lib/types/database'

export const AGENT_OUTPUT_TYPES: OutputType[] = ['doc', 'sheet', 'text', 'pdf']

// Missing keys default to on so pre-wizard agents keep their old behavior.
export function parseEnabledTools(value: unknown): AgentEnabledTools {
  const obj = (value ?? {}) as Partial<AgentEnabledTools>
  return {
    web_search: obj.web_search !== false,
    drive: obj.drive !== false,
  }
}
