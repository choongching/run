export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'user'
export type AgentEnabledTools = { web_search: boolean; drive: boolean }
export type AgentStatus = 'draft' | 'active' | 'paused' | 'archived'
export type UsageEventType =
  | 'mission_run'
  | 'prompt_generation'
  | 'agent_naming'
// What started the work: the person asked, a schedule fired, or we did it on
// their behalf. Separate from UsageEventType, which says what kind of work.
export type UsageSource = 'chat' | 'schedule' | 'system'
// A failed run still cost us, so it is still recorded; it just is not charged
// to the person or shown to them as work delivered.
export type UsageStatus = 'completed' | 'failed'
export type MessageRole = 'user' | 'agent' | 'activity'
// 'paused' is the user's switch; 'paused_system' is ours (out of runs, or
// three failures in a row). Distinct so the UI can never conflate them.
export type RoutineStatus = 'active' | 'paused' | 'paused_system'
export type RoutineRunStatus = 'running' | 'completed' | 'failed' | 'skipped'
// How a knowledge source's text got here: typed in, or extracted from an
// upload. Connector-backed sources will add their own kind.
export type KnowledgeKind = 'note' | 'file'

// Hand-authored to match supabase/migrations/*.sql.
// Regenerate with the Supabase CLI/MCP type generator as the schema grows.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          id: string
          claude_agent_id: string | null
          name: string
          description: string | null
          system_prompt: string | null
          model: string
          status: AgentStatus
          owner_id: string | null
          enabled_tools: AgentEnabledTools
          archived_at: string | null
          claude_version: number | null
          synced_at: string | null
          onboarded: boolean
          preferences: Json | null
          personality: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          claude_agent_id?: string | null
          name: string
          description?: string | null
          system_prompt?: string | null
          model?: string
          status?: AgentStatus
          owner_id?: string | null
          enabled_tools?: AgentEnabledTools
          archived_at?: string | null
          claude_version?: number | null
          synced_at?: string | null
          onboarded?: boolean
          preferences?: Json | null
          personality?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          claude_agent_id?: string | null
          name?: string
          description?: string | null
          system_prompt?: string | null
          model?: string
          status?: AgentStatus
          owner_id?: string | null
          enabled_tools?: AgentEnabledTools
          archived_at?: string | null
          claude_version?: number | null
          synced_at?: string | null
          onboarded?: boolean
          preferences?: Json | null
          personality?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agents_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      company_settings: {
        Row: {
          id: string
          anthropic_environment_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          anthropic_environment_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          anthropic_environment_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_sources: {
        Row: {
          id: string
          owner_id: string
          title: string
          kind: KnowledgeKind
          content: string
          char_count: number
          checksum: string | null
          origin: Json | null
          applies_to_all: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          kind?: KnowledgeKind
          content: string
          char_count?: number
          checksum?: string | null
          origin?: Json | null
          applies_to_all?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          kind?: KnowledgeKind
          content?: string
          char_count?: number
          checksum?: string | null
          origin?: Json | null
          applies_to_all?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_knowledge: {
        Row: {
          id: string
          agent_id: string
          source_id: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          source_id: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          source_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_knowledge_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_knowledge_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'knowledge_sources'
            referencedColumns: ['id']
          },
        ]
      }
      usage_events: {
        Row: {
          id: string
          user_id: string
          agent_id: string | null
          agent_name: string | null
          thread_id: string | null
          source: UsageSource
          status: UsageStatus
          model: string
          input_tokens: number
          cache_creation_input_tokens: number
          cache_read_input_tokens: number
          output_tokens: number
          web_searches: number
          cost_usd: number
          event_type: UsageEventType
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_id?: string | null
          agent_name?: string | null
          thread_id?: string | null
          source?: UsageSource
          status?: UsageStatus
          model: string
          input_tokens?: number
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
          output_tokens?: number
          web_searches?: number
          cost_usd?: number
          event_type: UsageEventType
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string | null
          agent_name?: string | null
          thread_id?: string | null
          source?: UsageSource
          status?: UsageStatus
          model?: string
          input_tokens?: number
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
          output_tokens?: number
          web_searches?: number
          cost_usd?: number
          event_type?: UsageEventType
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_events_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_events_thread_id_fkey'
            columns: ['thread_id']
            isOneToOne: false
            referencedRelation: 'threads'
            referencedColumns: ['id']
          },
        ]
      }
      threads: {
        Row: {
          id: string
          agent_id: string
          user_id: string
          session_id: string | null
          pending_tools: Json | null
          setup_answers: Json | null
          pending_attachment: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          user_id: string
          session_id?: string | null
          pending_tools?: Json | null
          setup_answers?: Json | null
          pending_attachment?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          user_id?: string
          session_id?: string | null
          pending_tools?: Json | null
          setup_answers?: Json | null
          pending_attachment?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'threads_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: number
          thread_id: string
          role: MessageRole
          content: string
          payload: Json
          attachments: Json | null
          created_at: string
        }
        Insert: {
          id?: never
          thread_id: string
          role: MessageRole
          content?: string
          payload?: Json
          attachments?: Json | null
          created_at?: string
        }
        Update: {
          id?: never
          thread_id?: string
          role?: MessageRole
          content?: string
          payload?: Json
          attachments?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_thread_id_fkey'
            columns: ['thread_id']
            isOneToOne: false
            referencedRelation: 'threads'
            referencedColumns: ['id']
          },
        ]
      }
      routines: {
        Row: {
          id: string
          agent_id: string
          user_id: string
          name: string
          instruction: string
          rule: Json
          status: RoutineStatus
          next_run_at: string | null
          last_run_at: string | null
          consecutive_failures: number
          carry: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          user_id: string
          name: string
          instruction: string
          rule: Json
          status?: RoutineStatus
          next_run_at?: string | null
          last_run_at?: string | null
          consecutive_failures?: number
          carry?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          user_id?: string
          name?: string
          instruction?: string
          rule?: Json
          status?: RoutineStatus
          next_run_at?: string | null
          last_run_at?: string | null
          consecutive_failures?: number
          carry?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'routines_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      routine_runs: {
        Row: {
          id: string
          routine_id: string
          agent_id: string | null
          user_id: string
          status: RoutineRunStatus
          started_at: string
          finished_at: string | null
          headline: string | null
          error: string | null
          session_id: string | null
          pending_tools: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          agent_id?: string | null
          user_id: string
          status?: RoutineRunStatus
          started_at?: string
          finished_at?: string | null
          headline?: string | null
          error?: string | null
          session_id?: string | null
          pending_tools?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          routine_id?: string
          agent_id?: string | null
          user_id?: string
          status?: RoutineRunStatus
          started_at?: string
          finished_at?: string | null
          headline?: string | null
          error?: string | null
          session_id?: string | null
          pending_tools?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'routine_runs_routine_id_fkey'
            columns: ['routine_id']
            isOneToOne: false
            referencedRelation: 'routines'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routine_runs_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      user_connections: {
        Row: {
          id: string
          user_id: string
          app: string
          pipedream_account_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          app: string
          pipedream_account_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          app?: string
          pipedream_account_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      // One row per person per month. Read-only rollup of usage_events; RLS
      // is the table's own (security_invoker), so a reader sees only months
      // they are allowed to see.
      usage_monthly: {
        Row: {
          user_id: string
          month: string
          runs: number
          failed_runs: number
          input_tokens: number
          cache_creation_input_tokens: number
          cache_read_input_tokens: number
          output_tokens: number
          web_searches: number
          cost_usd: number
        }
        Relationships: [
          {
            foreignKeyName: 'usage_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
      agent_status: AgentStatus
      message_role: MessageRole
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type CompanySettings = Database['public']['Tables']['company_settings']['Row']
export type KnowledgeSource = Database['public']['Tables']['knowledge_sources']['Row']
export type AgentKnowledge = Database['public']['Tables']['agent_knowledge']['Row']
export type Thread = Database['public']['Tables']['threads']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type UserConnection = Database['public']['Tables']['user_connections']['Row']
export type UsageEvent = Database['public']['Tables']['usage_events']['Row']
export type Routine = Database['public']['Tables']['routines']['Row']
export type RoutineRun = Database['public']['Tables']['routine_runs']['Row']
export type UsageMonth = Database['public']['Views']['usage_monthly']['Row']
