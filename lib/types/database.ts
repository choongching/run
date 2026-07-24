export type UserRole = 'admin' | 'user'
export type OutputType = 'doc' | 'sheet' | 'text'
export type AgentStatus = 'draft' | 'active' | 'paused' | 'archived'
export type MissionStatus = 'needs_attention' | 'in_progress' | 'completed'
export type MissionOutputType = 'doc' | 'sheet' | 'text' | 'pdf'

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
          archived_at: string | null
          claude_version: number | null
          synced_at: string | null
          default_output_type: OutputType | null
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
          archived_at?: string | null
          claude_version?: number | null
          synced_at?: string | null
          default_output_type?: OutputType | null
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
          archived_at?: string | null
          claude_version?: number | null
          synced_at?: string | null
          default_output_type?: OutputType | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: string
          company_context: string | null
          pipedream_account_id: string | null
          pipedream_connected_by: string | null
          pipedream_connected_at: string | null
          anthropic_environment_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          company_context?: string | null
          pipedream_account_id?: string | null
          pipedream_connected_by?: string | null
          pipedream_connected_at?: string | null
          anthropic_environment_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          company_context?: string | null
          pipedream_account_id?: string | null
          pipedream_connected_by?: string | null
          pipedream_connected_at?: string | null
          anthropic_environment_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_knowledge: {
        Row: {
          id: string
          agent_id: string
          file_id: string
          file_name: string
          file_mime_type: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          file_id: string
          file_name: string
          file_mime_type: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          file_id?: string
          file_name?: string
          file_mime_type?: string
          created_at?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          id: string
          user_id: string
          agent_id: string
          title: string
          brief: string
          status: MissionStatus
          output_type: MissionOutputType
          output_url: string | null
          output_text: string | null
          anthropic_run_id: string | null
          web_search: boolean
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          agent_id: string
          title: string
          brief: string
          status?: MissionStatus
          output_type?: MissionOutputType
          output_url?: string | null
          output_text?: string | null
          anthropic_run_id?: string | null
          web_search?: boolean
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string
          title?: string
          brief?: string
          status?: MissionStatus
          output_type?: MissionOutputType
          output_url?: string | null
          output_text?: string | null
          anthropic_run_id?: string | null
          web_search?: boolean
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'missions_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'missions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_agents: {
        Row: {
          id: string
          user_id: string
          agent_id: string
          custom_instructions: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_id: string
          custom_instructions?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string
          custom_instructions?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_agents_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_agents_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
      agent_status: AgentStatus
      mission_status: MissionStatus
      mission_output_type: MissionOutputType
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type CompanySettings = Database['public']['Tables']['company_settings']['Row']
export type UserAgent = Database['public']['Tables']['user_agents']['Row']
export type AgentKnowledge = Database['public']['Tables']['agent_knowledge']['Row']
export type Mission = Database['public']['Tables']['missions']['Row']
