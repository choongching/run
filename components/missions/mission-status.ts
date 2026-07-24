import type { Mission, MissionOutputType, MissionStatus } from '@/lib/types/database'

export type MissionWithAgent = Mission & { agents: { name: string } | null }

export type SquadAgent = {
  id: string
  name: string
  description: string | null
}

// Shared status + output metadata for the board, cards, and detail page.

export const MISSION_COLUMNS: { status: MissionStatus; title: string }[] = [
  { status: 'needs_attention', title: 'Queued' },
  { status: 'in_progress', title: 'In progress' },
  { status: 'completed', title: 'Completed' },
]

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  needs_attention: 'Queued',
  in_progress: 'In progress',
  completed: 'Completed',
}

// Meta-chip dots: same palette logic as agent status chips.
export const MISSION_STATUS_DOT: Record<MissionStatus, string> = {
  needs_attention: 'bg-muted-foreground/40',
  in_progress: 'bg-chart-4',
  completed: 'bg-chart-1',
}

export const OUTPUT_TYPE_LABEL: Record<MissionOutputType, string> = {
  doc: 'Google Doc',
  sheet: 'Google Sheet',
  pdf: 'PDF',
  text: 'Text',
}
