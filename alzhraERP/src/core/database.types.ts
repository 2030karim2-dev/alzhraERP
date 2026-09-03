export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      system_platform_configs: {
        Row: {
          key: string
          value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          key: string
          value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      csp_reports: {
        Row: {
          blocked_uri: string | null
          column_number: number | null
          company_id: string | null
          disposition: string | null
          document_uri: string | null
          effective_directive: string | null
          id: number
          line_number: number | null
          original_policy: string | null
          raw_payload: Json
          received_at: string
          referrer: string | null
          remote_addr: string | null
          script_sample: string | null
          source_file: string | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
          violated_directive: string | null
        }
        Insert: {
          blocked_uri?: string | null
          column_number?: number | null
          company_id?: string | null
          disposition?: string | null
          document_uri?: string | null
          effective_directive?: string | null
          id?: number
          line_number?: number | null
          original_policy?: string | null
          raw_payload: Json
          received_at?: string
          referrer?: string | null
          remote_addr?: string | null
          script_sample?: string | null
          source_file?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
          violated_directive?: string | null
        }
        Update: {
          blocked_uri?: string | null
          column_number?: number | null
          company_id?: string | null
          disposition?: string | null
          document_uri?: string | null
          effective_directive?: string | null
          id?: number
          line_number?: number | null
          original_policy?: string | null
          raw_payload?: Json
          received_at?: string
          referrer?: string | null
          remote_addr?: string | null
          script_sample?: string | null
          source_file?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
          violated_directive?: string | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          id: number
          detected_at: string
          alert_type: string
          severity: string
          user_id: string | null
          company_id: string | null
          source_ip: string | null
          user_agent: string | null
          details: Json
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
        }
        Insert: {
          id?: number
          detected_at?: string
          alert_type: string
          severity: string
          user_id?: string | null
          company_id?: string | null
          source_ip?: string | null
          user_agent?: string | null
          details?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
        Update: {
          id?: number
          detected_at?: string
          alert_type?: string
          severity?: string
          user_id?: string | null
          company_id?: string | null
          source_ip?: string | null
          user_agent?: string | null
          details?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          archived_at: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_private: boolean
          name: string
          reference_id: string | null
          reference_type: string | null
          type: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_message_id: string | null
          left_at: string | null
          muted_until: string | null
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_message_id?: string | null
          left_at?: string | null
          muted_until?: string | null
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_message_id?: string | null
          left_at?: string | null
          muted_until?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          client_message_id: string | null
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string
          metadata: Json
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          channel_id: string
          client_message_id?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          reply_to_id?: string | null
          sender_id?: string
        }
        Update: {
          channel_id?: string
          client_message_id?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      chat_message_attachments: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string
          mime_type: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          message_id: string
          mime_type?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          allow_posting: boolean
          code: string
          company_id: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name_ar: string
          name_en: string | null
          parent_id: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allow_posting?: boolean
          code: string
          company_id: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allow_posting?: boolean
          code?: string
          company_id?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_part_lookup_cache: {
        Row: {
          alternatives: Json | null
          brand: string | null
          company_id: string | null
          created_at: string | null
          expires_at: string | null
          hit_count: number | null
          id: string
          image_url: string | null
          is_global: boolean
          part_number: string
          raw_response: Json | null
          source_sites: string[] | null
        }
        Insert: {
          alternatives?: Json | null
          brand?: string | null
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          image_url?: string | null
          is_global?: boolean
          part_number: string
          raw_response?: Json | null
          source_sites?: string[] | null
        }
        Update: {
          alternatives?: Json | null
          brand?: string | null
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          image_url?: string | null
          is_global?: boolean
          part_number?: string
          raw_response?: Json | null
          source_sites?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ai_cache_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_request_log: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          company_id: string | null
          completion_tokens: number | null
          cost_estimate: number | null
          created_at: string | null
          error_type: string | null
          id: string
          is_success: boolean | null
          latency_ms: number | null
          model: string
          prompt_tokens: number | null
          task_type: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          completion_tokens?: number | null
          cost_estimate?: number | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          is_success?: boolean | null
          latency_ms?: number | null
          model: string
          prompt_tokens?: number | null
          task_type: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          completion_tokens?: number | null
          cost_estimate?: number | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          is_success?: boolean | null
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number | null
          task_type?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          company_id: string
          endpoint: string
          id: string
          request_count: number | null
          updated_at: string
          window_start: string | null
        }
        Insert: {
          company_id: string
          endpoint: string
          id?: string
          request_count?: number | null
          updated_at?: string
          window_start?: string | null
        }
        Update: {
          company_id?: string
          endpoint?: string
          id?: string
          request_count?: number | null
          updated_at?: string
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_items: {
        Row: {
          company_id: string
          counted_quantity: number | null
          created_at: string
          created_by: string | null
          expected_quantity: number
          id: string
          notes: string | null
          product_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          counted_quantity?: number | null
          created_at?: string
          created_by?: string | null
          expected_quantity?: number
          id?: string
          notes?: string | null
          product_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          counted_quantity?: number | null
          created_at?: string
          created_by?: string | null
          expected_quantity?: number
          id?: string
          notes?: string | null
          product_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "audit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "audit_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "audit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audit_items_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_archive: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_sessions: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          id: string
          status: string
          title: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_configs: {
        Row: {
          auto_backup_enabled: boolean
          backup_frequency_hours: number
          company_id: string
          created_at: string
          google_drive_folder_id: string | null
          last_backup_at: string | null
          updated_at: string
        }
        Insert: {
          auto_backup_enabled?: boolean
          backup_frequency_hours?: number
          company_id: string
          created_at?: string
          google_drive_folder_id?: string | null
          last_backup_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_backup_enabled?: boolean
          backup_frequency_hours?: number
          company_id?: string
          created_at?: string
          google_drive_folder_id?: string | null
          last_backup_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_logs: {
        Row: {
          backup_type: string
          company_id: string
          created_at: string
          error_message: string | null
          file_name: string | null
          file_size_bytes: number | null
          google_drive_link: string | null
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          backup_type: string
          company_id: string
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          google_drive_link?: string | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          backup_type?: string
          company_id?: string
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          google_drive_link?: string | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cashboxes: {
        Row: {
          account_id: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashboxes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashboxes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashboxes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashboxes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashboxes_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          base_currency: string
          created_at: string
          id: string
          is_active: boolean
          is_tax_enabled: boolean | null
          logo_url: string | null
          name_ar: string
          name_en: string | null
          owner_id: string | null
          phone: string | null
          plan_id: string | null
          subscription_status: string | null
          tax_number: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          base_currency?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_tax_enabled?: boolean | null
          logo_url?: string | null
          name_ar: string
          name_en?: string | null
          owner_id?: string | null
          phone?: string | null
          plan_id?: string | null
          subscription_status?: string | null
          tax_number?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          base_currency?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_tax_enabled?: boolean | null
          logo_url?: string | null
          name_ar?: string
          name_en?: string | null
          owner_id?: string | null
          phone?: string | null
          plan_id?: string | null
          subscription_status?: string | null
          tax_number?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_base_currency_fkey"
            columns: ["base_currency"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activities: {
        Row: {
          activity_type: string
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          duration_minutes: number | null
          id: string
          outcome: string | null
          priority: string | null
          scheduled_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          outcome?: string | null
          priority?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          outcome?: string | null
          priority?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          is_important: boolean | null
          note_type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          is_important?: boolean | null
          note_type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          is_important?: boolean | null
          note_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      customer_tag_assignments: {
        Row: {
          assigned_at: string | null
          customer_id: string
          tag_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          customer_id: string
          tag_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          customer_id?: string
          tag_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_followup_config: {
        Row: {
          company_id: string
          created_at: string
          critical_days: number
          due_soon_days: number
          id: string
          reminder_signature: string | null
          reminder_window_days: number
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          critical_days?: number
          due_soon_days?: number
          id?: string
          reminder_signature?: string | null
          reminder_window_days?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          critical_days?: number
          due_soon_days?: number
          id?: string
          reminder_signature?: string | null
          reminder_window_days?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "debt_followup_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_message_log: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          created_by: string | null
          error_info: string | null
          id: string
          message_text: string
          party_id: string
          recipient: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sent_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          channel?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          error_info?: string | null
          id?: string
          message_text: string
          party_id: string
          recipient?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          error_info?: string | null
          id?: string
          message_text?: string
          party_id?: string
          recipient?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_message_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_message_log_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_message_log_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_message_log_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
          {
            foreignKeyName: "debt_message_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "debt_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_message_templates: {
        Row: {
          body: string
          channel: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payment_promises: {
        Row: {
          amount: number
          cancelled_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          notes: string | null
          party_id: string
          promise_date: string
          reference_id: string | null
          reference_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          notes?: string | null
          party_id: string
          promise_date: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          notes?: string | null
          party_id?: string
          promise_date?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payment_promises_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payment_promises_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payment_promises_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payment_promises_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      exchange_companies: {
        Row: {
          account_id: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_companies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_companies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_companies_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          effective_date: string
          id: string
          rate_to_base: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          effective_date?: string
          id?: string
          rate_to_base?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          effective_date?: string
          id?: string
          rate_to_base?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      expense_categories: {
        Row: {
          account_id: string | null
          color: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category_id: string
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          description: string
          exchange_rate: number
          expense_date: string
          frequency: string | null
          id: string
          is_recurring: boolean
          payment_method: string
          recurring_end_date: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
          voucher_number: string | null
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          category_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          description: string
          exchange_rate?: number
          expense_date?: string
          frequency?: string | null
          id?: string
          is_recurring?: boolean
          payment_method?: string
          recurring_end_date?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          voucher_number?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string
          exchange_rate?: number
          expense_date?: string
          frequency?: string | null
          id?: string
          is_recurring?: boolean
          payment_method?: string
          recurring_end_date?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      external_cross_references: {
        Row: {
          cached_at: string | null
          company_id: string | null
          confidence: number | null
          evidence: string | null
          id: string
          match_quality: string
          provider: string
          source_number: string
          target_brand: string | null
          target_brand_id: number | null
          target_number: string
        }
        Insert: {
          cached_at?: string | null
          company_id?: string | null
          confidence?: number | null
          evidence?: string | null
          id?: string
          match_quality?: string
          provider: string
          source_number: string
          target_brand?: string | null
          target_brand_id?: number | null
          target_number: string
        }
        Update: {
          cached_at?: string | null
          company_id?: string | null
          confidence?: number | null
          evidence?: string | null
          id?: string
          match_quality?: string
          provider?: string
          source_number?: string
          target_brand?: string | null
          target_brand_id?: number | null
          target_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_cross_references_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_fitment_evidence: {
        Row: {
          company_id: string | null
          engine_code: string | null
          evidence_source: string | null
          evidence_text: string | null
          id: string
          make: string | null
          model: string | null
          normalized_number: string
          provider: string
          resolved_at: string | null
          status: string
          vin: string | null
          year: number | null
        }
        Insert: {
          company_id?: string | null
          engine_code?: string | null
          evidence_source?: string | null
          evidence_text?: string | null
          id?: string
          make?: string | null
          model?: string | null
          normalized_number: string
          provider: string
          resolved_at?: string | null
          status?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          company_id?: string | null
          engine_code?: string | null
          evidence_source?: string | null
          evidence_text?: string | null
          id?: string
          make?: string | null
          model?: string | null
          normalized_number?: string
          provider?: string
          resolved_at?: string | null
          status?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_fitment_evidence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string | null
          created_at: string | null
          description_ar: string | null
          enabled_for_companies: Json | null
          enabled_for_plans: Json | null
          id: string
          is_beta: boolean | null
          is_enabled_globally: boolean | null
          key: string
          name_ar: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description_ar?: string | null
          enabled_for_companies?: Json | null
          enabled_for_plans?: Json | null
          id?: string
          is_beta?: boolean | null
          is_enabled_globally?: boolean | null
          key: string
          name_ar: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description_ar?: string | null
          enabled_for_companies?: Json | null
          enabled_for_plans?: Json | null
          id?: string
          is_beta?: boolean | null
          is_enabled_globally?: boolean | null
          key?: string
          name_ar?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      file_attachments: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          storage_path: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_account_balances: {
        Row: {
          account_id: string
          closing_balance: number | null
          company_id: string
          created_at: string | null
          credit_total: number | null
          debit_total: number | null
          fiscal_year: number
          id: string
          opening_balance: number | null
          period: number
          updated_at: string | null
        }
        Insert: {
          account_id: string
          closing_balance?: number | null
          company_id: string
          created_at?: string | null
          credit_total?: number | null
          debit_total?: number | null
          fiscal_year: number
          id?: string
          opening_balance?: number | null
          period: number
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          closing_balance?: number | null
          company_id?: string
          created_at?: string | null
          credit_total?: number | null
          debit_total?: number | null
          fiscal_year?: number
          id?: string
          opening_balance?: number | null
          period?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["fin_account_type"]
          code: string
          company_id: string
          created_at: string | null
          currency_code: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          is_group: boolean | null
          name_ar: string
          name_en: string | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["fin_account_type"]
          code: string
          company_id: string
          created_at?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["fin_account_type"]
          code?: string
          company_id?: string
          created_at?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_journal_entries: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          journal_date: string
          journal_number: string
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["fin_journal_status"] | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          journal_date: string
          journal_number: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["fin_journal_status"] | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          journal_date?: string
          journal_number?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["fin_journal_status"] | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fin_journal_lines: {
        Row: {
          account_id: string
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_id: string
        }
        Insert: {
          account_id: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_id: string
        }
        Update: {
          account_id?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          closed_at: string | null
          company_id: string
          created_at: string
          end_date: string
          id: string
          is_closed: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_years_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          calculation_id: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          original_calculation_id: string | null
          reason: string
          status: string
        }
        Insert: {
          adjustment_type: string
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          calculation_id: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          original_calculation_id?: string | null
          reason: string
          status?: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          calculation_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          original_calculation_id?: string | null
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjustments_calc_company_fk"
            columns: ["company_id", "calculation_id"]
            isOneToOne: false
            referencedRelation: "incentive_calculations"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "incentive_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_adjustments_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "incentive_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_adjustments_original_calculation_id_fkey"
            columns: ["original_calculation_id"]
            isOneToOne: false
            referencedRelation: "incentive_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_assignments: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          plan_id: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          plan_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "incentive_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_calculation_lines: {
        Row: {
          base_amount: number
          calculated_amount: number
          calculation_id: string
          company_id: string
          created_at: string
          currency_code: string
          description: string | null
          id: string
          invoice_id: string | null
          invoice_line_id: string | null
          rate: number | null
          rule_id: string | null
          source_id: string | null
          source_type: string
          tier_id: string | null
        }
        Insert: {
          base_amount: number
          calculated_amount: number
          calculation_id: string
          company_id: string
          created_at?: string
          currency_code: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          invoice_line_id?: string | null
          rate?: number | null
          rule_id?: string | null
          source_id?: string | null
          source_type: string
          tier_id?: string | null
        }
        Update: {
          base_amount?: number
          calculated_amount?: number
          calculation_id?: string
          company_id?: string
          created_at?: string
          currency_code?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          invoice_line_id?: string | null
          rate?: number | null
          rule_id?: string | null
          source_id?: string | null
          source_type?: string
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calc_lines_calc_company_fk"
            columns: ["company_id", "calculation_id"]
            isOneToOne: false
            referencedRelation: "incentive_calculations"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "incentive_calculation_lines_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "incentive_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculation_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculation_lines_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "incentive_calculation_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculation_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculation_lines_invoice_line_id_fkey"
            columns: ["invoice_line_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculation_lines_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "incentive_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculation_lines_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "incentive_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_calculations: {
        Row: {
          adjustment_amount: number
          approved_at: string | null
          approved_by: string | null
          base_commission: number
          bonus_amount: number
          calculated_at: string | null
          calculated_by: string | null
          collected_amount: number
          collection_note: string | null
          company_id: string
          currency_code: string
          customer_count: number
          deduction_amount: number
          gross_profit: number
          gross_sales: number
          id: string
          invoice_count: number
          net_sales: number
          paid_at: string | null
          period_id: string
          plan_id: string
          status: string
          target_achievement_pct: number | null
          target_value: number | null
          total_commission: number
          user_id: string
        }
        Insert: {
          adjustment_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          base_commission?: number
          bonus_amount?: number
          calculated_at?: string | null
          calculated_by?: string | null
          collected_amount?: number
          collection_note?: string | null
          company_id: string
          currency_code: string
          customer_count?: number
          deduction_amount?: number
          gross_profit?: number
          gross_sales?: number
          id?: string
          invoice_count?: number
          net_sales?: number
          paid_at?: string | null
          period_id: string
          plan_id: string
          status?: string
          target_achievement_pct?: number | null
          target_value?: number | null
          total_commission?: number
          user_id: string
        }
        Update: {
          adjustment_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          base_commission?: number
          bonus_amount?: number
          calculated_at?: string | null
          calculated_by?: string | null
          collected_amount?: number
          collection_note?: string | null
          company_id?: string
          currency_code?: string
          customer_count?: number
          deduction_amount?: number
          gross_profit?: number
          gross_sales?: number
          id?: string
          invoice_count?: number
          net_sales?: number
          paid_at?: string | null
          period_id?: string
          plan_id?: string
          status?: string
          target_achievement_pct?: number | null
          target_value?: number | null
          total_commission?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calcs_period_company_fk"
            columns: ["company_id", "period_id"]
            isOneToOne: false
            referencedRelation: "incentive_periods"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "incentive_calculations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculations_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculations_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculations_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "incentive_calculations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "incentive_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "incentive_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_engineer_links: {
        Row: {
          allocation_pct: number
          allocation_status: string
          assigned_at: string
          assigned_by: string
          assignment_type: string
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          reason: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_pct: number
          allocation_status?: string
          assigned_at?: string
          assigned_by: string
          assignment_type?: string
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          reason?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_pct?: number
          allocation_status?: string
          assigned_at?: string
          assigned_by?: string
          assignment_type?: string
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          reason?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_engineer_links_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_engineer_links_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_engineer_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_engineer_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_engineer_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_engineer_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_engineer_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_invoice_company_fk"
            columns: ["company_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "links_invoice_company_fk"
            columns: ["company_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      incentive_payments: {
        Row: {
          account_id: string | null
          accounting_transaction_id: string | null
          amount: number
          calculation_id: string
          company_id: string
          created_at: string
          created_by: string
          currency_code: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          reference: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          accounting_transaction_id?: string | null
          amount: number
          calculation_id: string
          company_id: string
          created_at?: string
          created_by: string
          currency_code: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          reference?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          accounting_transaction_id?: string | null
          amount?: number
          calculation_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_payments_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "incentive_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "incentive_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_calc_company_fk"
            columns: ["company_id", "calculation_id"]
            isOneToOne: false
            referencedRelation: "incentive_calculations"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      incentive_pending_invoices: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string
          detected_at: string
          id: string
          invoice_id: string
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          detected_at?: string
          id?: string
          invoice_id: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          detected_at?: string
          id?: string
          invoice_id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_pending_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_pending_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_pending_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_pending_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_pending_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_pending_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_pending_invoices_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_pending_invoices_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invoice_company_fk"
            columns: ["company_id", "invoice_id"]
            isOneToOne: true
            referencedRelation: "active_invoices"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "pending_invoice_company_fk"
            columns: ["company_id", "invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      incentive_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          calculated_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          fiscal_year_id: string | null
          id: string
          is_test_period: boolean
          locked_at: string | null
          locked_by: string | null
          paid_at: string | null
          paid_by: string | null
          period_end: string
          period_label: string
          period_start: string
          state: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          calculated_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          fiscal_year_id?: string | null
          id?: string
          is_test_period?: boolean
          locked_at?: string | null
          locked_by?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_end: string
          period_label: string
          period_start: string
          state?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          calculated_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          fiscal_year_id?: string | null
          id?: string
          is_test_period?: boolean
          locked_at?: string | null
          locked_by?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_periods_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "incentive_periods_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_periods_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_plans: {
        Row: {
          calculation_basis: string
          collection_mode: string
          company_id: string
          created_at: string
          created_by: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          name: string
          status: string
          tier_currency_code: string | null
          tier_method: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calculation_basis: string
          collection_mode?: string
          company_id: string
          created_at?: string
          created_by: string
          currency_code: string
          deleted_at?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          name: string
          status?: string
          tier_currency_code?: string | null
          tier_method?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calculation_basis?: string
          collection_mode?: string
          company_id?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          name?: string
          status?: string
          tier_currency_code?: string | null
          tier_method?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incentive_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_plans_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "incentive_plans_tier_currency_code_fkey"
            columns: ["tier_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "incentive_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_rules: {
        Row: {
          calculation_method: string
          company_id: string
          conditions: Json | null
          created_at: string
          created_by: string
          deleted_at: string | null
          fixed_amount: number | null
          id: string
          is_active: boolean
          name: string
          plan_id: string
          priority: number
          rate: number | null
          rule_type: string
          threshold_max: number | null
          threshold_min: number | null
          tier_currency_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calculation_method: string
          company_id: string
          conditions?: Json | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          name: string
          plan_id: string
          priority?: number
          rate?: number | null
          rule_type: string
          threshold_max?: number | null
          threshold_min?: number | null
          tier_currency_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calculation_method?: string
          company_id?: string
          conditions?: Json | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          name?: string
          plan_id?: string
          priority?: number
          rate?: number | null
          rule_type?: string
          threshold_max?: number | null
          threshold_min?: number | null
          tier_currency_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incentive_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "incentive_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_rules_tier_currency_code_fkey"
            columns: ["tier_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "incentive_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_targets: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          status: string
          target_owner_id: string
          target_owner_type: string
          target_scope: string
          target_type: string
          target_value: number
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          id?: string
          period_end: string
          period_start: string
          period_type?: string
          status?: string
          target_owner_id: string
          target_owner_type: string
          target_scope: string
          target_type: string
          target_value: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string
          target_owner_id?: string
          target_owner_type?: string
          target_scope?: string
          target_type?: string
          target_value?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incentive_targets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_targets_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "incentive_targets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_targets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_tiers: {
        Row: {
          company_id: string
          created_at: string
          fixed_bonus: number | null
          from_amount: number
          id: string
          plan_id: string
          rate: number | null
          rule_id: string | null
          tier_currency_code: string
          tier_order: number
          to_amount: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          fixed_bonus?: number | null
          from_amount: number
          id?: string
          plan_id: string
          rate?: number | null
          rule_id?: string | null
          tier_currency_code: string
          tier_order: number
          to_amount?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          fixed_bonus?: number | null
          from_amount?: number
          id?: string
          plan_id?: string
          rate?: number | null
          rule_id?: string | null
          tier_currency_code?: string
          tier_order?: number
          to_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incentive_tiers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_tiers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "incentive_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_tiers_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "incentive_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_tiers_tier_currency_code_fkey"
            columns: ["tier_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      inv_stock_audit_items: {
        Row: {
          audit_id: string
          counted_quantity: number | null
          id: string
          notes: string | null
          product_id: string
          system_quantity: number
          variance: number | null
        }
        Insert: {
          audit_id: string
          counted_quantity?: number | null
          id?: string
          notes?: string | null
          product_id: string
          system_quantity?: number
          variance?: number | null
        }
        Update: {
          audit_id?: string
          counted_quantity?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          system_quantity?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_audits: {
        Row: {
          audit_number: string
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["inv_audit_status"] | null
          title: string
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          audit_number: string
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["inv_audit_status"] | null
          title: string
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          audit_number?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["inv_audit_status"] | null
          title?: string
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_audits_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inv_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_ledger: {
        Row: {
          average_cost: number | null
          company_id: string
          created_at: string | null
          id: string
          last_movement_at: string | null
          product_id: string
          quantity: number | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          average_cost?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          last_movement_at?: string | null
          product_id: string
          quantity?: number | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          average_cost?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          last_movement_at?: string | null
          product_id?: string
          quantity?: number | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inv_stock_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inv_stock_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inv_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_movement_items: {
        Row: {
          id: string
          movement_id: string
          notes: string | null
          product_id: string
          quantity: number
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          id?: string
          movement_id: string
          notes?: string | null
          product_id: string
          quantity: number
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          id?: string
          movement_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_movement_items_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_movements: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          movement_date: string
          movement_number: string
          movement_type: Database["public"]["Enums"]["inv_movement_type"]
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["inv_movement_status"] | null
          to_warehouse_id: string | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_number: string
          movement_type: Database["public"]["Enums"]["inv_movement_type"]
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["inv_movement_status"] | null
          to_warehouse_id?: string | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_number?: string
          movement_type?: Database["public"]["Enums"]["inv_movement_type"]
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["inv_movement_status"] | null
          to_warehouse_id?: string | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inv_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inv_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_warehouses: {
        Row: {
          branch_id: string | null
          code: string
          company_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          location: string | null
          name_ar: string
          name_en: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          code: string
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          location?: string | null
          name_ar: string
          name_en?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          code?: string
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          location?: string | null
          name_ar?: string
          name_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_session_drafts: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          session_id: string
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items?: Json
          session_id: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          session_id?: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_session_drafts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "audit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_session_drafts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number
          transaction_type: string
          unit_cost: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost: number
          transaction_type: string
          unit_cost: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number
          transaction_type?: string
          unit_cost?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          company_id: string
          cost_price: number
          description: string | null
          discount_amount: number
          id: string
          invoice_id: string
          is_core_return: boolean | null
          product_id: string | null
          quantity: number
          tax_amount: number
          tax_rate_id: string | null
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          cost_price?: number
          description?: string | null
          discount_amount?: number
          id?: string
          invoice_id: string
          is_core_return?: boolean | null
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          tax_rate_id?: string | null
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          cost_price?: number
          description?: string | null
          discount_amount?: number
          id?: string
          invoice_id?: string
          is_core_return?: boolean | null
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          tax_rate_id?: string | null
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoice_items_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "invoice_items_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          discount_amount: number
          due_date: string | null
          exchange_rate: number
          fiscal_year_id: string | null
          id: string
          idempotency_key: string | null
          invoice_number: string | null
          issue_date: string
          notes: string | null
          paid_amount: number
          party_id: string | null
          payment_account_id: string | null
          payment_method: string | null
          reference_invoice_id: string | null
          return_reason: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          discount_amount?: number
          due_date?: string | null
          exchange_rate?: number
          fiscal_year_id?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          party_id?: string | null
          payment_account_id?: string | null
          payment_method?: string | null
          reference_invoice_id?: string | null
          return_reason?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          discount_amount?: number
          due_date?: string | null
          exchange_rate?: number
          fiscal_year_id?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          party_id?: string | null
          payment_account_id?: string | null
          payment_method?: string | null
          reference_invoice_id?: string | null
          return_reason?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_fiscal_year"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
          {
            foreignKeyName: "invoices_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reference_invoice_id_fkey"
            columns: ["reference_invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reference_invoice_id_fkey"
            columns: ["reference_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          entry_date: string
          entry_number: number
          fiscal_year_id: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_date?: string
          entry_number: number
          fiscal_year_id?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: number
          fiscal_year_id?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          branch_id: string | null
          company_id: string
          created_at: string
          credit_amount: number
          currency_code: string | null
          debit_amount: number
          deleted_at: string | null
          description: string | null
          exchange_rate: number | null
          foreign_amount: number | null
          id: string
          journal_entry_id: string
          party_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          company_id: string
          created_at?: string
          credit_amount?: number
          currency_code?: string | null
          debit_amount?: number
          deleted_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          foreign_amount?: number | null
          id?: string
          journal_entry_id: string
          party_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          company_id?: string
          created_at?: string
          credit_amount?: number
          currency_code?: string | null
          debit_amount?: number
          deleted_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          foreign_amount?: number | null
          id?: string
          journal_entry_id?: string
          party_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal_entry_lines_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "active_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      messaging_config: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notify_on_expense: boolean
          notify_on_low_stock: boolean
          notify_on_payment_bond: boolean
          notify_on_purchase: boolean
          notify_on_sale: boolean
          notify_on_stock_transfer: boolean
          telegram_bot_token: string
          telegram_chat_id: string
          telegram_enabled: boolean
          updated_at: string
          whatsapp_api_key: string
          whatsapp_api_url: string
          whatsapp_enabled: boolean
          whatsapp_phone: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notify_on_expense?: boolean
          notify_on_low_stock?: boolean
          notify_on_payment_bond?: boolean
          notify_on_purchase?: boolean
          notify_on_sale?: boolean
          notify_on_stock_transfer?: boolean
          telegram_bot_token?: string
          telegram_chat_id?: string
          telegram_enabled?: boolean
          updated_at?: string
          whatsapp_api_key?: string
          whatsapp_api_url?: string
          whatsapp_enabled?: boolean
          whatsapp_phone?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notify_on_expense?: boolean
          notify_on_low_stock?: boolean
          notify_on_payment_bond?: boolean
          notify_on_purchase?: boolean
          notify_on_sale?: boolean
          notify_on_stock_transfer?: boolean
          telegram_bot_token?: string
          telegram_chat_id?: string
          telegram_enabled?: boolean
          updated_at?: string
          whatsapp_api_key?: string
          whatsapp_api_url?: string
          whatsapp_enabled?: boolean
          whatsapp_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_targets: {
        Row: {
          branch_id: string | null
          collection_target: number
          company_id: string
          created_at: string
          id: string
          month: number
          sales_target: number
          updated_at: string
          year: number
        }
        Insert: {
          branch_id?: string | null
          collection_target?: number
          company_id: string
          created_at?: string
          id?: string
          month: number
          sales_target?: number
          updated_at?: string
          year: number
        }
        Update: {
          branch_id?: string | null
          collection_target?: number
          company_id?: string
          created_at?: string
          id?: string
          month?: number
          sales_target?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_targets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          message: string
          reference_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          message: string
          reference_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          message?: string
          reference_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      part_catalog_cache: {
        Row: {
          cached_at: string | null
          company_id: string | null
          description: string | null
          display_number: string | null
          expires_at: string | null
          id: string
          manufacturer: string | null
          manufacturer_id: number | null
          normalized_number: string
          provider: string
          response_json: Json | null
        }
        Insert: {
          cached_at?: string | null
          company_id?: string | null
          description?: string | null
          display_number?: string | null
          expires_at?: string | null
          id?: string
          manufacturer?: string | null
          manufacturer_id?: number | null
          normalized_number: string
          provider: string
          response_json?: Json | null
        }
        Update: {
          cached_at?: string | null
          company_id?: string | null
          description?: string | null
          display_number?: string | null
          expires_at?: string | null
          id?: string
          manufacturer?: string | null
          manufacturer_id?: number | null
          normalized_number?: string
          provider?: string
          response_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "part_catalog_cache_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      part_compatibility: {
        Row: {
          company_id: string
          compatibility_status: string
          confidence: number | null
          created_at: string | null
          engine_code: string | null
          evidence: Json | null
          id: string
          manufacturer: string | null
          part_number: string
          source: string
          updated_at: string | null
          vehicle_make: string
          vehicle_model: string | null
          vehicle_year_from: number | null
          vehicle_year_to: number | null
        }
        Insert: {
          company_id: string
          compatibility_status?: string
          confidence?: number | null
          created_at?: string | null
          engine_code?: string | null
          evidence?: Json | null
          id?: string
          manufacturer?: string | null
          part_number: string
          source?: string
          updated_at?: string | null
          vehicle_make: string
          vehicle_model?: string | null
          vehicle_year_from?: number | null
          vehicle_year_to?: number | null
        }
        Update: {
          company_id?: string
          compatibility_status?: string
          confidence?: number | null
          created_at?: string | null
          engine_code?: string | null
          evidence?: Json | null
          id?: string
          manufacturer?: string | null
          part_number?: string
          source?: string
          updated_at?: string | null
          vehicle_make?: string
          vehicle_model?: string | null
          vehicle_year_from?: number | null
          vehicle_year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "part_compatibility_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          address: string | null
          avg_rating: number | null
          birth_date: string | null
          category_id: string | null
          commercial_registration: string | null
          company_id: string
          created_at: string
          credit_limit: number | null
          customer_since: string | null
          customer_type: string | null
          deleted_at: string | null
          delivery_lead_days: number | null
          email: string | null
          id: string
          is_active_supplier: boolean | null
          last_contact_date: string | null
          last_invoice_date: string | null
          last_purchase_date: string | null
          lead_source: string | null
          loyalty_points: number | null
          min_order_amount: number | null
          name: string
          payment_terms_days: number | null
          phone: string | null
          preferred_contact_method: string | null
          satisfaction_score: number | null
          search_vector: unknown
          status: string
          supplier_type: string | null
          tax_number: string | null
          total_invoices_count: number | null
          total_orders_count: number | null
          total_paid_amount: number | null
          total_purchases_amount: number | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          avg_rating?: number | null
          birth_date?: string | null
          category_id?: string | null
          commercial_registration?: string | null
          company_id: string
          created_at?: string
          credit_limit?: number | null
          customer_since?: string | null
          customer_type?: string | null
          deleted_at?: string | null
          delivery_lead_days?: number | null
          email?: string | null
          id?: string
          is_active_supplier?: boolean | null
          last_contact_date?: string | null
          last_invoice_date?: string | null
          last_purchase_date?: string | null
          lead_source?: string | null
          loyalty_points?: number | null
          min_order_amount?: number | null
          name: string
          payment_terms_days?: number | null
          phone?: string | null
          preferred_contact_method?: string | null
          satisfaction_score?: number | null
          search_vector?: unknown
          status?: string
          supplier_type?: string | null
          tax_number?: string | null
          total_invoices_count?: number | null
          total_orders_count?: number | null
          total_paid_amount?: number | null
          total_purchases_amount?: number | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          avg_rating?: number | null
          birth_date?: string | null
          category_id?: string | null
          commercial_registration?: string | null
          company_id?: string
          created_at?: string
          credit_limit?: number | null
          customer_since?: string | null
          customer_type?: string | null
          deleted_at?: string | null
          delivery_lead_days?: number | null
          email?: string | null
          id?: string
          is_active_supplier?: boolean | null
          last_contact_date?: string | null
          last_invoice_date?: string | null
          last_purchase_date?: string | null
          lead_source?: string | null
          loyalty_points?: number | null
          min_order_amount?: number | null
          name?: string
          payment_terms_days?: number | null
          phone?: string | null
          preferred_contact_method?: string | null
          satisfaction_score?: number | null
          search_vector?: unknown
          status?: string
          supplier_type?: string | null
          tax_number?: string | null
          total_invoices_count?: number | null
          total_orders_count?: number | null
          total_paid_amount?: number | null
          total_purchases_amount?: number | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "party_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      party_categories: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      party_opening_balances: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          direction: string
          entry_date: string
          id: string
          notes: string | null
          party_id: string
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          direction?: string
          entry_date?: string
          id?: string
          notes?: string | null
          party_id: string
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          direction?: string
          entry_date?: string
          id?: string
          notes?: string | null
          party_id?: string
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_opening_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_opening_balances_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_opening_balances_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_opening_balances_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          invoice_id: string
          payment_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id: string
          payment_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string
          payment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "active_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string | null
          amount: number
          branch_id: string | null
          company_id: string
          counterparty_account_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          exchange_rate: number
          id: string
          notes: string | null
          party_id: string | null
          payment_date: string
          payment_method: string
          payment_number: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          branch_id?: string | null
          company_id: string
          counterparty_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          exchange_rate?: number
          id?: string
          notes?: string | null
          party_id?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          branch_id?: string | null
          company_id?: string
          counterparty_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          exchange_rate?: number
          id?: string
          notes?: string | null
          party_id?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_counterparty_account_id_fkey"
            columns: ["counterparty_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_counterparty_account_id_fkey"
            columns: ["counterparty_account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      prc_contract_items: {
        Row: {
          agreed_price: number
          company_id: string
          contract_id: string
          contract_item_id: string
          created_at: string
          currency: string
          product_id: string
        }
        Insert: {
          agreed_price: number
          company_id: string
          contract_id: string
          contract_item_id?: string
          created_at?: string
          currency?: string
          product_id: string
        }
        Update: {
          agreed_price?: number
          company_id?: string
          contract_id?: string
          contract_item_id?: string
          created_at?: string
          currency?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prc_supplier_contracts"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      prc_goods_receipt_documents: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          document_type: string
          file_url: string
          grn_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id?: string
          document_type: string
          file_url: string
          grn_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          document_type?: string
          file_url?: string
          grn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_goods_receipt_documents_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "prc_goods_receipts"
            referencedColumns: ["grn_id"]
          },
        ]
      }
      prc_goods_receipt_items: {
        Row: {
          accepted_quantity: number
          company_id: string
          created_at: string
          delivered_quantity: number
          grn_id: string
          grn_item_id: string
          po_item_id: string
          product_id: string | null
          rejected_quantity: number
          rejection_reason: string | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          accepted_quantity?: number
          company_id: string
          created_at?: string
          delivered_quantity?: number
          grn_id: string
          grn_item_id?: string
          po_item_id: string
          product_id?: string | null
          rejected_quantity?: number
          rejection_reason?: string | null
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          accepted_quantity?: number
          company_id?: string
          created_at?: string
          delivered_quantity?: number
          grn_id?: string
          grn_item_id?: string
          po_item_id?: string
          product_id?: string | null
          rejected_quantity?: number
          rejection_reason?: string | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_goods_receipt_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "prc_goods_receipts"
            referencedColumns: ["grn_id"]
          },
          {
            foreignKeyName: "prc_goods_receipt_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_order_items"
            referencedColumns: ["po_item_id"]
          },
        ]
      }
      prc_goods_receipts: {
        Row: {
          company_id: string
          created_at: string
          delivery_note_number: string | null
          grn_id: string
          grn_number: string
          notes: string | null
          po_id: string
          receipt_date: string
          received_by: string
          status: string
          supplier_id: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          delivery_note_number?: string | null
          grn_id?: string
          grn_number: string
          notes?: string | null
          po_id: string
          receipt_date?: string
          received_by: string
          status?: string
          supplier_id: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          delivery_note_number?: string | null
          grn_id?: string
          grn_number?: string
          notes?: string | null
          po_id?: string
          receipt_date?: string
          received_by?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_goods_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_orders"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "prc_goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_purchase_invoice_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          grn_item_id: string | null
          invoice_id: string
          invoice_item_id: string
          invoiced_quantity: number
          po_item_id: string | null
          product_id: string | null
          tax_amount: number | null
          total_price: number
          unit_price: number
          updated_at: string
          variance_amount: number | null
          variance_reason: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          grn_item_id?: string | null
          invoice_id: string
          invoice_item_id?: string
          invoiced_quantity: number
          po_item_id?: string | null
          product_id?: string | null
          tax_amount?: number | null
          total_price: number
          unit_price: number
          updated_at?: string
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          grn_item_id?: string | null
          invoice_id?: string
          invoice_item_id?: string
          invoiced_quantity?: number
          po_item_id?: string | null
          product_id?: string | null
          tax_amount?: number | null
          total_price?: number
          unit_price?: number
          updated_at?: string
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_purchase_invoice_items_grn_item_id_fkey"
            columns: ["grn_item_id"]
            isOneToOne: false
            referencedRelation: "prc_goods_receipt_items"
            referencedColumns: ["grn_item_id"]
          },
          {
            foreignKeyName: "prc_purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "prc_purchase_invoice_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_order_items"
            referencedColumns: ["po_item_id"]
          },
        ]
      }
      prc_purchase_invoices: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          due_date: string | null
          invoice_date: string
          invoice_id: string
          invoice_number: string
          matching_status: string
          po_id: string
          status: string
          subtotal: number | null
          supplier_id: string
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
          invoice_date: string
          invoice_id?: string
          invoice_number: string
          matching_status?: string
          po_id: string
          status?: string
          subtotal?: number | null
          supplier_id: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          invoice_date?: string
          invoice_id?: string
          invoice_number?: string
          matching_status?: string
          po_id?: string
          status?: string
          subtotal?: number | null
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_purchase_invoices_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_orders"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "prc_purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_purchase_order_documents: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          document_type: string
          file_url: string
          po_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id?: string
          document_type: string
          file_url: string
          po_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          document_type?: string
          file_url?: string
          po_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_purchase_order_documents_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_orders"
            referencedColumns: ["po_id"]
          },
        ]
      }
      prc_purchase_order_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          discount_percentage: number | null
          net_unit_price: number
          po_id: string
          po_item_id: string
          pr_item_id: string | null
          product_id: string | null
          quantity: number
          received_quantity: number | null
          tax_percentage: number | null
          total_price: number
          unit_of_measure: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          discount_percentage?: number | null
          net_unit_price: number
          po_id: string
          po_item_id?: string
          pr_item_id?: string | null
          product_id?: string | null
          quantity: number
          received_quantity?: number | null
          tax_percentage?: number | null
          total_price: number
          unit_of_measure: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          discount_percentage?: number | null
          net_unit_price?: number
          po_id?: string
          po_item_id?: string
          pr_item_id?: string | null
          product_id?: string | null
          quantity?: number
          received_quantity?: number | null
          tax_percentage?: number | null
          total_price?: number
          unit_of_measure?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_orders"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "prc_purchase_order_items_pr_item_id_fkey"
            columns: ["pr_item_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_request_items"
            referencedColumns: ["pr_item_id"]
          },
        ]
      }
      prc_purchase_orders: {
        Row: {
          buyer_id: string
          company_id: string
          contract_id: string | null
          created_at: string
          currency: string
          expected_delivery_date: string | null
          issue_date: string | null
          notes: string | null
          payment_terms: string | null
          po_id: string
          po_number: string
          quotation_id: string | null
          rfq_id: string | null
          shipping_address_id: string | null
          shipping_terms: string | null
          status: string
          subtotal: number | null
          supplier_id: string
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          company_id: string
          contract_id?: string | null
          created_at?: string
          currency?: string
          expected_delivery_date?: string | null
          issue_date?: string | null
          notes?: string | null
          payment_terms?: string | null
          po_id?: string
          po_number: string
          quotation_id?: string | null
          rfq_id?: string | null
          shipping_address_id?: string | null
          shipping_terms?: string | null
          status?: string
          subtotal?: number | null
          supplier_id: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          company_id?: string
          contract_id?: string | null
          created_at?: string
          currency?: string
          expected_delivery_date?: string | null
          issue_date?: string | null
          notes?: string | null
          payment_terms?: string | null
          po_id?: string
          po_number?: string
          quotation_id?: string | null
          rfq_id?: string | null
          shipping_address_id?: string | null
          shipping_terms?: string | null
          status?: string
          subtotal?: number | null
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_purchase_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "prc_supplier_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "prc_purchase_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "prc_quotations"
            referencedColumns: ["quotation_id"]
          },
          {
            foreignKeyName: "prc_purchase_orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "prc_rfqs"
            referencedColumns: ["rfq_id"]
          },
          {
            foreignKeyName: "prc_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_purchase_request_documents: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          document_type: string
          file_url: string
          pr_id: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id?: string
          document_type: string
          file_url: string
          pr_id: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          document_type?: string
          file_url?: string
          pr_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_purchase_request_documents_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_requests"
            referencedColumns: ["pr_id"]
          },
        ]
      }
      prc_purchase_request_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          estimated_unit_price: number | null
          pr_id: string
          pr_item_id: string
          product_id: string | null
          quantity: number
          total_estimated_price: number | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          estimated_unit_price?: number | null
          pr_id: string
          pr_item_id?: string
          product_id?: string | null
          quantity?: number
          total_estimated_price?: number | null
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          estimated_unit_price?: number | null
          pr_id?: string
          pr_item_id?: string
          product_id?: string | null
          quantity?: number
          total_estimated_price?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_purchase_request_items_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_requests"
            referencedColumns: ["pr_id"]
          },
        ]
      }
      prc_purchase_requests: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          department_id: string | null
          justification: string | null
          pr_id: string
          pr_number: string
          priority: string
          requester_id: string
          required_date: string | null
          status: string
          total_estimated_value: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          department_id?: string | null
          justification?: string | null
          pr_id?: string
          pr_number: string
          priority?: string
          requester_id: string
          required_date?: string | null
          status?: string
          total_estimated_value?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          department_id?: string | null
          justification?: string | null
          pr_id?: string
          pr_number?: string
          priority?: string
          requester_id?: string
          required_date?: string | null
          status?: string
          total_estimated_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      prc_quotation_documents: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          document_type: string
          file_url: string
          quotation_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id?: string
          document_type: string
          file_url: string
          quotation_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          document_type?: string
          file_url?: string
          quotation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_quotation_documents_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "prc_quotations"
            referencedColumns: ["quotation_id"]
          },
        ]
      }
      prc_quotation_items: {
        Row: {
          company_id: string
          created_at: string
          discount_percentage: number | null
          net_unit_price: number
          offered_quantity: number
          product_id: string | null
          quotation_id: string
          quotation_item_id: string
          remarks: string | null
          rfq_item_id: string
          tax_percentage: number | null
          total_price: number
          unit_of_measure: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          discount_percentage?: number | null
          net_unit_price: number
          offered_quantity: number
          product_id?: string | null
          quotation_id: string
          quotation_item_id?: string
          remarks?: string | null
          rfq_item_id: string
          tax_percentage?: number | null
          total_price: number
          unit_of_measure: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          discount_percentage?: number | null
          net_unit_price?: number
          offered_quantity?: number
          product_id?: string | null
          quotation_id?: string
          quotation_item_id?: string
          remarks?: string | null
          rfq_item_id?: string
          tax_percentage?: number | null
          total_price?: number
          unit_of_measure?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "prc_quotations"
            referencedColumns: ["quotation_id"]
          },
          {
            foreignKeyName: "prc_quotation_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "prc_rfq_items"
            referencedColumns: ["rfq_item_id"]
          },
        ]
      }
      prc_quotation_revisions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          delivery_lead_time_days: number | null
          discount_amount: number
          exchange_rate: number
          id: string
          items_snapshot: Json
          notes: string | null
          quotation_id: string
          revision_number: number
          status: string
          subtotal: number
          tax_amount: number
          terms_and_conditions: string | null
          total_amount: number
          warranty_days: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_lead_time_days?: number | null
          discount_amount?: number
          exchange_rate?: number
          id?: string
          items_snapshot?: Json
          notes?: string | null
          quotation_id: string
          revision_number?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          terms_and_conditions?: string | null
          total_amount?: number
          warranty_days?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_lead_time_days?: number | null
          discount_amount?: number
          exchange_rate?: number
          id?: string
          items_snapshot?: Json
          notes?: string | null
          quotation_id?: string
          revision_number?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          terms_and_conditions?: string | null
          total_amount?: number
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_quotation_revisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prc_quotation_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prc_quotation_revisions_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "prc_quotations"
            referencedColumns: ["quotation_id"]
          },
        ]
      }
      prc_quotations: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          delivery_lead_time_days: number | null
          notes: string | null
          payment_terms: string | null
          quotation_id: string
          quotation_number: string | null
          rfq_id: string
          status: string
          supplier_id: string
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          delivery_lead_time_days?: number | null
          notes?: string | null
          payment_terms?: string | null
          quotation_id?: string
          quotation_number?: string | null
          rfq_id: string
          status?: string
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          delivery_lead_time_days?: number | null
          notes?: string | null
          payment_terms?: string | null
          quotation_id?: string
          quotation_number?: string | null
          rfq_id?: string
          status?: string
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "prc_rfqs"
            referencedColumns: ["rfq_id"]
          },
          {
            foreignKeyName: "prc_quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_rfq_evaluation_items: {
        Row: {
          awarded_quantity: number
          awarded_quotation_item_id: string
          company_id: string
          created_at: string
          evaluation_id: string
          evaluation_item_id: string
          reason_for_selection: string | null
          rfq_item_id: string
          updated_at: string
        }
        Insert: {
          awarded_quantity: number
          awarded_quotation_item_id: string
          company_id: string
          created_at?: string
          evaluation_id: string
          evaluation_item_id?: string
          reason_for_selection?: string | null
          rfq_item_id: string
          updated_at?: string
        }
        Update: {
          awarded_quantity?: number
          awarded_quotation_item_id?: string
          company_id?: string
          created_at?: string
          evaluation_id?: string
          evaluation_item_id?: string
          reason_for_selection?: string | null
          rfq_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_rfq_evaluation_items_awarded_quotation_item_id_fkey"
            columns: ["awarded_quotation_item_id"]
            isOneToOne: false
            referencedRelation: "prc_quotation_items"
            referencedColumns: ["quotation_item_id"]
          },
          {
            foreignKeyName: "prc_rfq_evaluation_items_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "prc_rfq_evaluations"
            referencedColumns: ["evaluation_id"]
          },
          {
            foreignKeyName: "prc_rfq_evaluation_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "prc_rfq_items"
            referencedColumns: ["rfq_item_id"]
          },
        ]
      }
      prc_rfq_evaluation_scores: {
        Row: {
          company_id: string
          created_at: string
          delivery_score: number | null
          evaluation_id: string
          is_recommended: boolean | null
          price_score: number | null
          quotation_id: string
          rank: number | null
          score_id: string
          technical_score: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delivery_score?: number | null
          evaluation_id: string
          is_recommended?: boolean | null
          price_score?: number | null
          quotation_id: string
          rank?: number | null
          score_id?: string
          technical_score?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delivery_score?: number | null
          evaluation_id?: string
          is_recommended?: boolean | null
          price_score?: number | null
          quotation_id?: string
          rank?: number | null
          score_id?: string
          technical_score?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_rfq_evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "prc_rfq_evaluations"
            referencedColumns: ["evaluation_id"]
          },
          {
            foreignKeyName: "prc_rfq_evaluation_scores_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "prc_quotations"
            referencedColumns: ["quotation_id"]
          },
        ]
      }
      prc_rfq_evaluations: {
        Row: {
          company_id: string
          created_at: string
          evaluation_date: string | null
          evaluation_id: string
          evaluator_id: string
          justification: string | null
          rfq_id: string
          selected_quotation_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          evaluation_date?: string | null
          evaluation_id?: string
          evaluator_id: string
          justification?: string | null
          rfq_id: string
          selected_quotation_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          evaluation_date?: string | null
          evaluation_id?: string
          evaluator_id?: string
          justification?: string | null
          rfq_id?: string
          selected_quotation_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_rfq_evaluations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "prc_rfqs"
            referencedColumns: ["rfq_id"]
          },
          {
            foreignKeyName: "prc_rfq_evaluations_selected_quotation_id_fkey"
            columns: ["selected_quotation_id"]
            isOneToOne: false
            referencedRelation: "prc_quotations"
            referencedColumns: ["quotation_id"]
          },
        ]
      }
      prc_rfq_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          pr_item_id: string | null
          product_id: string | null
          quantity: number
          rfq_id: string
          rfq_item_id: string
          target_unit_price: number | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          pr_item_id?: string | null
          product_id?: string | null
          quantity: number
          rfq_id: string
          rfq_item_id?: string
          target_unit_price?: number | null
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          pr_item_id?: string | null
          product_id?: string | null
          quantity?: number
          rfq_id?: string
          rfq_item_id?: string
          target_unit_price?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_rfq_items_pr_item_id_fkey"
            columns: ["pr_item_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_request_items"
            referencedColumns: ["pr_item_id"]
          },
          {
            foreignKeyName: "prc_rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "prc_rfqs"
            referencedColumns: ["rfq_id"]
          },
        ]
      }
      prc_rfq_suppliers: {
        Row: {
          company_id: string
          invited_at: string
          responded_at: string | null
          rfq_id: string
          rfq_supplier_id: string
          status: string
          supplier_id: string
        }
        Insert: {
          company_id: string
          invited_at?: string
          responded_at?: string | null
          rfq_id: string
          rfq_supplier_id?: string
          status?: string
          supplier_id: string
        }
        Update: {
          company_id?: string
          invited_at?: string
          responded_at?: string | null
          rfq_id?: string
          rfq_supplier_id?: string
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_rfq_suppliers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "prc_rfqs"
            referencedColumns: ["rfq_id"]
          },
          {
            foreignKeyName: "prc_rfq_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_rfqs: {
        Row: {
          buyer_id: string
          company_id: string
          created_at: string
          delivery_date: string | null
          rfq_id: string
          rfq_number: string
          status: string
          submission_deadline: string
          terms_and_conditions: string | null
          title: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          company_id: string
          created_at?: string
          delivery_date?: string | null
          rfq_id?: string
          rfq_number: string
          status?: string
          submission_deadline: string
          terms_and_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          company_id?: string
          created_at?: string
          delivery_date?: string | null
          rfq_id?: string
          rfq_number?: string
          status?: string
          submission_deadline?: string
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      prc_supplier_addresses: {
        Row: {
          address_id: string
          address_line_1: string
          address_line_2: string | null
          address_type: string
          city: string
          company_id: string
          country: string
          created_at: string
          is_primary: boolean | null
          state: string | null
          supplier_id: string
          zip_code: string | null
        }
        Insert: {
          address_id?: string
          address_line_1: string
          address_line_2?: string | null
          address_type: string
          city: string
          company_id: string
          country: string
          created_at?: string
          is_primary?: boolean | null
          state?: string | null
          supplier_id: string
          zip_code?: string | null
        }
        Update: {
          address_id?: string
          address_line_1?: string
          address_line_2?: string | null
          address_type?: string
          city?: string
          company_id?: string
          country?: string
          created_at?: string
          is_primary?: boolean | null
          state?: string | null
          supplier_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_addresses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_account_id: string
          bank_name: string
          branch_name: string | null
          company_id: string
          created_at: string
          currency: string
          iban: string | null
          is_primary: boolean | null
          supplier_id: string
          swift_code: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_account_id?: string
          bank_name: string
          branch_name?: string | null
          company_id: string
          created_at?: string
          currency?: string
          iban?: string | null
          is_primary?: boolean | null
          supplier_id: string
          swift_code?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_account_id?: string
          bank_name?: string
          branch_name?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          iban?: string | null
          is_primary?: boolean | null
          supplier_id?: string
          swift_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_bank_accounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_capabilities: {
        Row: {
          capability_id: string
          capability_name: string
          company_id: string
          created_at: string
          description: string | null
          supplier_id: string
          verified: boolean | null
        }
        Insert: {
          capability_id?: string
          capability_name: string
          company_id: string
          created_at?: string
          description?: string | null
          supplier_id: string
          verified?: boolean | null
        }
        Update: {
          capability_id?: string
          capability_name?: string
          company_id?: string
          created_at?: string
          description?: string | null
          supplier_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_capabilities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_categories: {
        Row: {
          category_id: string
          company_id: string
          created_at: string
          description: string | null
          name: string
          parent_category_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string
          company_id: string
          created_at?: string
          description?: string | null
          name: string
          parent_category_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
          name?: string
          parent_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "prc_supplier_categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      prc_supplier_contacts: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          department: string | null
          email: string | null
          first_name: string
          is_primary: boolean | null
          last_name: string
          phone: string | null
          supplier_id: string
          title: string | null
        }
        Insert: {
          company_id: string
          contact_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          first_name: string
          is_primary?: boolean | null
          last_name: string
          phone?: string | null
          supplier_id: string
          title?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string
          is_primary?: boolean | null
          last_name?: string
          phone?: string | null
          supplier_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_contracts: {
        Row: {
          company_id: string
          contract_id: string
          contract_number: string
          created_at: string
          currency: string | null
          end_date: string | null
          start_date: string
          status: string
          supplier_id: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          company_id: string
          contract_id?: string
          contract_number: string
          created_at?: string
          currency?: string | null
          end_date?: string | null
          start_date: string
          status?: string
          supplier_id: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          company_id?: string
          contract_id?: string
          contract_number?: string
          created_at?: string
          currency?: string | null
          end_date?: string | null
          start_date?: string
          status?: string
          supplier_id?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_documents: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          document_type: string
          expiry_date: string | null
          file_url: string
          is_verified: boolean | null
          issue_date: string | null
          reminder_days: number[] | null
          supplier_id: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id?: string
          document_type: string
          expiry_date?: string | null
          file_url: string
          is_verified?: boolean | null
          issue_date?: string | null
          reminder_days?: number[] | null
          supplier_id: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          document_type?: string
          expiry_date?: string | null
          file_url?: string
          is_verified?: boolean | null
          issue_date?: string | null
          reminder_days?: number[] | null
          supplier_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_metrics: {
        Row: {
          calculated_at: string
          company_id: string
          metric_id: string
          on_time_delivery_rate: number | null
          period_end: string
          period_start: string
          price_variance_avg: number | null
          quality_acceptance_rate: number | null
          rfq_response_rate: number | null
          supplier_id: string
        }
        Insert: {
          calculated_at?: string
          company_id: string
          metric_id?: string
          on_time_delivery_rate?: number | null
          period_end: string
          period_start: string
          price_variance_avg?: number | null
          quality_acceptance_rate?: number | null
          rfq_response_rate?: number | null
          supplier_id: string
        }
        Update: {
          calculated_at?: string
          company_id?: string
          metric_id?: string
          on_time_delivery_rate?: number | null
          period_end?: string
          period_start?: string
          price_variance_avg?: number | null
          quality_acceptance_rate?: number | null
          rfq_response_rate?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_metrics_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_prices: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          discount: number | null
          effective_from: string
          effective_to: string | null
          minimum_quantity: number
          price_id: string
          status: string
          supplier_product_id: string
          tax_percentage: number | null
          unit_price: number
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          discount?: number | null
          effective_from?: string
          effective_to?: string | null
          minimum_quantity?: number
          price_id?: string
          status?: string
          supplier_product_id: string
          tax_percentage?: number | null
          unit_price: number
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          discount?: number | null
          effective_from?: string
          effective_to?: string | null
          minimum_quantity?: number
          price_id?: string
          status?: string
          supplier_product_id?: string
          tax_percentage?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_prices_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "prc_supplier_products"
            referencedColumns: ["supplier_product_id"]
          },
        ]
      }
      prc_supplier_products: {
        Row: {
          barcode: string | null
          company_id: string
          created_at: string
          default_currency: string
          default_tax: string | null
          is_active: boolean | null
          lead_time_days: number
          minimum_order_quantity: number
          order_multiple: number
          preferred_supplier: boolean | null
          preferred_warehouse: string | null
          priority: number | null
          product_id: string
          supplier_id: string
          supplier_part_number: string | null
          supplier_product_id: string
          supplier_sku: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          company_id: string
          created_at?: string
          default_currency?: string
          default_tax?: string | null
          is_active?: boolean | null
          lead_time_days?: number
          minimum_order_quantity?: number
          order_multiple?: number
          preferred_supplier?: boolean | null
          preferred_warehouse?: string | null
          priority?: number | null
          product_id: string
          supplier_id: string
          supplier_part_number?: string | null
          supplier_product_id?: string
          supplier_sku?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          company_id?: string
          created_at?: string
          default_currency?: string
          default_tax?: string | null
          is_active?: boolean | null
          lead_time_days?: number
          minimum_order_quantity?: number
          order_multiple?: number
          preferred_supplier?: boolean | null
          preferred_warehouse?: string | null
          priority?: number | null
          product_id?: string
          supplier_id?: string
          supplier_part_number?: string | null
          supplier_product_id?: string
          supplier_sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_scores: {
        Row: {
          company_id: string
          delivery_score: number | null
          flexibility_score: number | null
          last_evaluated_at: string | null
          overall_score: number | null
          price_score: number | null
          quality_score: number | null
          response_score: number | null
          score_id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          delivery_score?: number | null
          flexibility_score?: number | null
          last_evaluated_at?: string | null
          overall_score?: number | null
          price_score?: number | null
          quality_score?: number | null
          response_score?: number | null
          score_id?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          delivery_score?: number | null
          flexibility_score?: number | null
          last_evaluated_at?: string | null
          overall_score?: number | null
          price_score?: number | null
          quality_score?: number | null
          response_score?: number | null
          score_id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_scores_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_sla_violations: {
        Row: {
          actual_value: number
          company_id: string
          created_at: string
          notes: string | null
          penalty_applied: boolean | null
          reference_id: string
          reference_type: string
          sla_id: string
          supplier_id: string
          violation_date: string
          violation_id: string
        }
        Insert: {
          actual_value: number
          company_id: string
          created_at?: string
          notes?: string | null
          penalty_applied?: boolean | null
          reference_id: string
          reference_type: string
          sla_id: string
          supplier_id: string
          violation_date?: string
          violation_id?: string
        }
        Update: {
          actual_value?: number
          company_id?: string
          created_at?: string
          notes?: string | null
          penalty_applied?: boolean | null
          reference_id?: string
          reference_type?: string
          sla_id?: string
          supplier_id?: string
          violation_date?: string
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_sla_violations_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "prc_supplier_slas"
            referencedColumns: ["sla_id"]
          },
          {
            foreignKeyName: "prc_supplier_sla_violations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_slas: {
        Row: {
          company_id: string
          created_at: string
          is_active: boolean
          penalty_percentage: number | null
          sla_id: string
          sla_name: string
          supplier_id: string
          target_value: number
          updated_at: string
          warning_threshold: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          is_active?: boolean
          penalty_percentage?: number | null
          sla_id?: string
          sla_name: string
          supplier_id: string
          target_value: number
          updated_at?: string
          warning_threshold?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          is_active?: boolean
          penalty_percentage?: number | null
          sla_id?: string
          sla_name?: string
          supplier_id?: string
          target_value?: number
          updated_at?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_slas_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_supplier_terms: {
        Row: {
          company_id: string
          credit_days: number | null
          credit_limit: number | null
          delivery_method: string | null
          incoterm: string | null
          payment_terms: string
          penalty_rules: string | null
          return_policy: string | null
          shipping_terms: string | null
          supplier_id: string
          terms_id: string
          updated_at: string
          warranty_terms: string | null
        }
        Insert: {
          company_id: string
          credit_days?: number | null
          credit_limit?: number | null
          delivery_method?: string | null
          incoterm?: string | null
          payment_terms: string
          penalty_rules?: string | null
          return_policy?: string | null
          shipping_terms?: string | null
          supplier_id: string
          terms_id?: string
          updated_at?: string
          warranty_terms?: string | null
        }
        Update: {
          company_id?: string
          credit_days?: number | null
          credit_limit?: number | null
          delivery_method?: string | null
          incoterm?: string | null
          payment_terms?: string
          penalty_rules?: string | null
          return_policy?: string | null
          shipping_terms?: string | null
          supplier_id?: string
          terms_id?: string
          updated_at?: string
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_supplier_terms_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "prc_suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prc_suppliers: {
        Row: {
          api_enabled: boolean | null
          auto_po_enabled: boolean | null
          auto_rfq_enabled: boolean | null
          category_id: string | null
          city: string
          commercial_registration: string | null
          company_id: string
          country: string
          created_at: string
          currency: string
          edi_enabled: boolean | null
          initial_rating: number | null
          is_approved: boolean | null
          language: string
          legal_name: string
          portal_enabled: boolean | null
          risk_level: string | null
          status: string
          supplier_code: string
          supplier_id: string
          supplier_type: string
          tax_number: string | null
          time_zone: string
          trade_name: string | null
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          api_enabled?: boolean | null
          auto_po_enabled?: boolean | null
          auto_rfq_enabled?: boolean | null
          category_id?: string | null
          city: string
          commercial_registration?: string | null
          company_id: string
          country: string
          created_at?: string
          currency?: string
          edi_enabled?: boolean | null
          initial_rating?: number | null
          is_approved?: boolean | null
          language?: string
          legal_name: string
          portal_enabled?: boolean | null
          risk_level?: string | null
          status?: string
          supplier_code: string
          supplier_id?: string
          supplier_type: string
          tax_number?: string | null
          time_zone?: string
          trade_name?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          api_enabled?: boolean | null
          auto_po_enabled?: boolean | null
          auto_rfq_enabled?: boolean | null
          category_id?: string | null
          city?: string
          commercial_registration?: string | null
          company_id?: string
          country?: string
          created_at?: string
          currency?: string
          edi_enabled?: boolean | null
          initial_rating?: number | null
          is_approved?: boolean | null
          language?: string
          legal_name?: string
          portal_enabled?: boolean | null
          risk_level?: string | null
          status?: string
          supplier_code?: string
          supplier_id?: string
          supplier_type?: string
          tax_number?: string | null
          time_zone?: string
          trade_name?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_suppliers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "prc_supplier_categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      prc_three_way_matches: {
        Row: {
          company_id: string
          created_at: string
          discrepancy_details: Json | null
          invoice_id: string
          is_successful: boolean
          match_date: string
          match_id: string
          matched_by: string
          po_id: string
          resolution_notes: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          discrepancy_details?: Json | null
          invoice_id: string
          is_successful: boolean
          match_date?: string
          match_id?: string
          matched_by: string
          po_id: string
          resolution_notes?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          discrepancy_details?: Json | null
          invoice_id?: string
          is_successful?: boolean
          match_date?: string
          match_id?: string
          matched_by?: string
          po_id?: string
          resolution_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prc_three_way_matches_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "prc_three_way_matches_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "prc_purchase_orders"
            referencedColumns: ["po_id"]
          },
        ]
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_categories_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cross_references: {
        Row: {
          alternative_product_id: string
          base_product_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          match_quality: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          alternative_product_id: string
          base_product_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          match_quality?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          alternative_product_id?: string
          base_product_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          match_quality?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_cross_references_alternative_product_id_fkey"
            columns: ["alternative_product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cross_references_alternative_product_id_fkey"
            columns: ["alternative_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cross_references_alternative_product_id_fkey"
            columns: ["alternative_product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_cross_references_alternative_product_id_fkey"
            columns: ["alternative_product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_cross_references_base_product_id_fkey"
            columns: ["base_product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cross_references_base_product_id_fkey"
            columns: ["base_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cross_references_base_product_id_fkey"
            columns: ["base_product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_cross_references_base_product_id_fkey"
            columns: ["base_product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_cross_references_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_fitment: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          product_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_fitment_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_fitment_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_fitment_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_fitment_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_fitment_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_fitment_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_kit_items: {
        Row: {
          company_id: string
          component_product_id: string
          created_at: string
          id: string
          kit_product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          company_id: string
          component_product_id: string
          created_at?: string
          id?: string
          kit_product_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          component_product_id?: string
          created_at?: string
          id?: string
          kit_product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_kit_items_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_kit_items_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_kit_items_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_kit_items_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_kit_items_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_kit_items_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_kit_items_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_kit_items_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_kit_items_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_search_numbers: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          normalization_version: number
          normalized_number: string
          number_type: string
          original_number: string
          product_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          normalization_version?: number
          normalized_number: string
          number_type: string
          original_number: string
          product_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          normalization_version?: number
          normalized_number?: string
          number_type?: string
          original_number?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_search_numbers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_search_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_search_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_search_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_search_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_stock: {
        Row: {
          company_id: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          updated_by: string | null
          warehouse_id: string
          weighted_avg_cost: number
        }
        Insert: {
          company_id: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
          weighted_avg_cost?: number
        }
        Update: {
          company_id?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
          weighted_avg_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_stock_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_supplier_prices: {
        Row: {
          company_id: string
          cost_price: number
          created_at: string
          created_by: string | null
          currency_code: string | null
          id: string
          lead_time_days: number | null
          notes: string | null
          product_id: string
          supplier_id: string
          supplier_part_number: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          cost_price: number
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          product_id: string
          supplier_id: string
          supplier_part_number?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          cost_price?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          product_id?: string
          supplier_id?: string
          supplier_part_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_supplier_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_prices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "product_supplier_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_supplier_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      product_uoms: {
        Row: {
          conversion_factor: number
          created_at: string | null
          id: string
          product_id: string | null
          uom_name: string
        }
        Insert: {
          conversion_factor: number
          created_at?: string | null
          id?: string
          product_id?: string | null
          uom_name: string
        }
        Update: {
          conversion_factor?: number
          created_at?: string | null
          id?: string
          product_id?: string | null
          uom_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_uoms_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_uoms_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_uoms_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_uoms_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          alternative_numbers: string | null
          barcode: string | null
          brand: string | null
          category_id: string | null
          company_id: string
          core_charge_amount: number | null
          cost_price: number
          created_at: string
          deleted_at: string | null
          description: string | null
          global_search_text: string | null
          has_core_charge: boolean | null
          id: string
          image_url: string | null
          is_kit: boolean | null
          location: string | null
          min_stock_level: number
          name_ar: string
          part_number: string | null
          purchase_price: number
          sale_price: number
          search_vector: unknown
          size: string | null
          sku: string
          specifications: string | null
          status: string
          unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alternative_numbers?: string | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          company_id: string
          core_charge_amount?: number | null
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          global_search_text?: string | null
          has_core_charge?: boolean | null
          id?: string
          image_url?: string | null
          is_kit?: boolean | null
          location?: string | null
          min_stock_level?: number
          name_ar: string
          part_number?: string | null
          purchase_price?: number
          sale_price?: number
          search_vector?: unknown
          size?: string | null
          sku: string
          specifications?: string | null
          status?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alternative_numbers?: string | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          company_id?: string
          core_charge_amount?: number | null
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          global_search_text?: string | null
          has_core_charge?: boolean | null
          id?: string
          image_url?: string | null
          is_kit?: boolean | null
          location?: string | null
          min_stock_level?: number
          name_ar?: string
          part_number?: string | null
          purchase_price?: number
          sale_price?: number
          search_vector?: unknown
          size?: string | null
          sku?: string
          specifications?: string | null
          status?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          discount_percent: number | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          quotation_id: string
          sort_order: number | null
          total: number
          unit_price: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id: string
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_quotation_items_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          branch_id: string | null
          company_id: string
          converted_at: string | null
          converted_invoice_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          deleted_at: string | null
          delivery_terms: string | null
          discount_amount: number | null
          exchange_rate: number | null
          id: string
          issue_date: string
          notes: string | null
          party_id: string | null
          payment_terms: string | null
          quotation_number: string
          rfq_group_id: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          terms_and_conditions: string | null
          total_amount: number
          type: string
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          converted_at?: string | null
          converted_invoice_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          delivery_terms?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          id?: string
          issue_date?: string
          notes?: string | null
          party_id?: string | null
          payment_terms?: string | null
          quotation_number: string
          rfq_group_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          type: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          converted_at?: string | null
          converted_invoice_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          delivery_terms?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          id?: string
          issue_date?: string
          notes?: string | null
          party_id?: string | null
          payment_terms?: string | null
          quotation_number?: string
          rfq_group_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          type?: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role?: string
        }
        Relationships: []
      }
      staging_jaafari_import: {
        Row: {
          brand: string | null
          id: number
          is_strict: boolean | null
          name: string | null
          part_number: string | null
          qty: number | null
          resolved: boolean | null
        }
        Insert: {
          brand?: string | null
          id?: number
          is_strict?: boolean | null
          name?: string | null
          part_number?: string | null
          qty?: number | null
          resolved?: boolean | null
        }
        Update: {
          brand?: string | null
          id?: number
          is_strict?: boolean | null
          name?: string | null
          part_number?: string | null
          qty?: number | null
          resolved?: boolean | null
        }
        Relationships: []
      }
      stock_transfer_items: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          transfer_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          quantity: number
          transfer_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          quantity?: number
          transfer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sti_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          from_warehouse_id: string
          id: string
          notes: string | null
          reversed_at: string | null
          status: string
          to_warehouse_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          from_warehouse_id: string
          id?: string
          notes?: string | null
          reversed_at?: string | null
          status?: string
          to_warehouse_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          reversed_at?: string | null
          status?: string
          to_warehouse_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          ai_tokens_monthly: number | null
          color: string | null
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_invoices_monthly: number | null
          max_products: number | null
          max_users: number | null
          name_ar: string
          name_en: string
          price_monthly: number | null
          price_yearly: number | null
          sort_order: number | null
        }
        Insert: {
          ai_tokens_monthly?: number | null
          color?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_invoices_monthly?: number | null
          max_products?: number | null
          max_users?: number | null
          name_ar: string
          name_en: string
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
        }
        Update: {
          ai_tokens_monthly?: number | null
          color?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_invoices_monthly?: number | null
          max_products?: number | null
          max_users?: number | null
          name_ar?: string
          name_en?: string
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      supplier_price_history: {
        Row: {
          company_id: string
          created_at: string
          currency_code: string
          effective_date: string
          id: string
          notes: string | null
          product_id: string
          supplier_id: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          currency_code?: string
          effective_date: string
          id?: string
          notes?: string | null
          product_id: string
          supplier_id: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          currency_code?: string
          effective_date?: string
          id?: string
          notes?: string | null
          product_id?: string
          supplier_id?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "supplier_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "supplier_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "supplier_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      supplier_ratings: {
        Row: {
          communication_rating: number | null
          company_id: string
          created_at: string
          delivery_rating: number | null
          id: string
          notes: string | null
          overall_rating: number | null
          price_rating: number | null
          quality_rating: number | null
          rated_by: string | null
          rating_date: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          communication_rating?: number | null
          company_id: string
          created_at?: string
          delivery_rating?: number | null
          id?: string
          notes?: string | null
          overall_rating?: number | null
          price_rating?: number | null
          quality_rating?: number | null
          rated_by?: string | null
          rating_date?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          communication_rating?: number | null
          company_id?: string
          created_at?: string
          delivery_rating?: number | null
          id?: string
          notes?: string | null
          overall_rating?: number | null
          price_rating?: number | null
          quality_rating?: number | null
          rated_by?: string | null
          rating_date?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ratings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      supported_currencies: {
        Row: {
          code: string
          exchange_operator: string
          is_base: boolean
          name_ar: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          exchange_operator?: string
          is_base?: boolean
          name_ar: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          exchange_operator?: string
          is_base?: boolean
          name_ar?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      suspended_orders: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          customer: Json | null
          id: string
          items: Json
          suspended_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          customer?: Json | null
          id?: string
          items?: Json
          suspended_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          customer?: Json | null
          id?: string
          items?: Json
          suspended_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspended_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspended_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sys_activity_log: {
        Row: {
          action: string
          activity_version: number | null
          company_id: string
          correlation_id: string | null
          device_type: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          occurred_at: string
          request_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          activity_version?: number | null
          company_id: string
          correlation_id?: string | null
          device_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          occurred_at?: string
          request_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          activity_version?: number | null
          company_id?: string
          correlation_id?: string | null
          device_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          occurred_at?: string
          request_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sys_background_workers: {
        Row: {
          heartbeat_at: string
          started_at: string
          status: string
          supported_job_types: string[] | null
          version: string | null
          worker_id: string
        }
        Insert: {
          heartbeat_at?: string
          started_at?: string
          status?: string
          supported_job_types?: string[] | null
          version?: string | null
          worker_id: string
        }
        Update: {
          heartbeat_at?: string
          started_at?: string
          status?: string
          supported_job_types?: string[] | null
          version?: string | null
          worker_id?: string
        }
        Relationships: []
      }
      sys_business_calendars: {
        Row: {
          calendar_id: string
          company_id: string
          holidays: string[] | null
          is_default: boolean | null
          name: string
          working_days: number[]
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          calendar_id?: string
          company_id: string
          holidays?: string[] | null
          is_default?: boolean | null
          name: string
          working_days?: number[]
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          calendar_id?: string
          company_id?: string
          holidays?: string[] | null
          is_default?: boolean | null
          name?: string
          working_days?: number[]
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: []
      }
      sys_config_registry: {
        Row: {
          category: string
          company_id: string
          description: string | null
          is_readonly: boolean | null
          is_secret: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
          validation_rule: string | null
          value: Json
          value_type: string
        }
        Insert: {
          category?: string
          company_id: string
          description?: string | null
          is_readonly?: boolean | null
          is_secret?: boolean | null
          key: string
          updated_at?: string
          updated_by?: string | null
          validation_rule?: string | null
          value: Json
          value_type?: string
        }
        Update: {
          category?: string
          company_id?: string
          description?: string | null
          is_readonly?: boolean | null
          is_secret?: boolean | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          validation_rule?: string | null
          value?: Json
          value_type?: string
        }
        Relationships: []
      }
      sys_dead_letter_queue: {
        Row: {
          attempt_count: number
          company_id: string
          correlation_id: string | null
          dead_letter_reason: string
          dlq_id: string
          first_attempt_at: string | null
          job_type: string
          last_attempt_at: string | null
          last_error: string | null
          moved_at: string
          original_job_id: string
          payload: Json
          worker_id: string | null
        }
        Insert: {
          attempt_count: number
          company_id: string
          correlation_id?: string | null
          dead_letter_reason: string
          dlq_id?: string
          first_attempt_at?: string | null
          job_type: string
          last_attempt_at?: string | null
          last_error?: string | null
          moved_at?: string
          original_job_id: string
          payload: Json
          worker_id?: string | null
        }
        Update: {
          attempt_count?: number
          company_id?: string
          correlation_id?: string | null
          dead_letter_reason?: string
          dlq_id?: string
          first_attempt_at?: string | null
          job_type?: string
          last_attempt_at?: string | null
          last_error?: string | null
          moved_at?: string
          original_job_id?: string
          payload?: Json
          worker_id?: string | null
        }
        Relationships: []
      }
      sys_domain_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          aggregate_id: string
          aggregate_type: string
          causation_id: string | null
          company_id: string
          correlation_id: string | null
          error_message: string | null
          event_id: string
          event_type: string
          event_version: number
          occurred_at: string
          payload: Json
          processed_at: string | null
          published_at: string | null
          schema_version: number
          status: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          aggregate_id: string
          aggregate_type: string
          causation_id?: string | null
          company_id: string
          correlation_id?: string | null
          error_message?: string | null
          event_id?: string
          event_type: string
          event_version?: number
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          published_at?: string | null
          schema_version?: number
          status?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          aggregate_id?: string
          aggregate_type?: string
          causation_id?: string | null
          company_id?: string
          correlation_id?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          event_version?: number
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          published_at?: string | null
          schema_version?: number
          status?: string
        }
        Relationships: []
      }
      sys_error_codes: {
        Row: {
          category: string
          code: string
          created_at: string | null
          developer_message: string | null
          domain: string
          http_status: number | null
          is_active: boolean | null
          retryable: boolean | null
          severity: string
          user_message_ar: string | null
          user_message_en: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          developer_message?: string | null
          domain: string
          http_status?: number | null
          is_active?: boolean | null
          retryable?: boolean | null
          severity: string
          user_message_ar?: string | null
          user_message_en?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          developer_message?: string | null
          domain?: string
          http_status?: number | null
          is_active?: boolean | null
          retryable?: boolean | null
          severity?: string
          user_message_ar?: string | null
          user_message_en?: string | null
        }
        Relationships: []
      }
      sys_feature_flags: {
        Row: {
          company_id: string
          effective_from: string | null
          effective_to: string | null
          flag_name: string
          is_enabled: boolean
          rollout_percentage: number | null
          target_companies: string[] | null
          target_roles: string[] | null
          target_users: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          effective_from?: string | null
          effective_to?: string | null
          flag_name: string
          is_enabled?: boolean
          rollout_percentage?: number | null
          target_companies?: string[] | null
          target_roles?: string[] | null
          target_users?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          effective_from?: string | null
          effective_to?: string | null
          flag_name?: string
          is_enabled?: boolean
          rollout_percentage?: number | null
          target_companies?: string[] | null
          target_roles?: string[] | null
          target_users?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      sys_job_archive: {
        Row: {
          archive_id: string
          archived_at: string
          attempt_count: number | null
          company_id: string
          correlation_id: string | null
          execution_time_ms: number | null
          job_type: string
          original_job_id: string
          payload: Json | null
          status: string
        }
        Insert: {
          archive_id?: string
          archived_at?: string
          attempt_count?: number | null
          company_id: string
          correlation_id?: string | null
          execution_time_ms?: number | null
          job_type: string
          original_job_id: string
          payload?: Json | null
          status: string
        }
        Update: {
          archive_id?: string
          archived_at?: string
          attempt_count?: number | null
          company_id?: string
          correlation_id?: string | null
          execution_time_ms?: number | null
          job_type?: string
          original_job_id?: string
          payload?: Json | null
          status?: string
        }
        Relationships: []
      }
      sys_job_queue: {
        Row: {
          attempt_count: number
          company_id: string
          correlation_id: string | null
          created_at: string
          expires_at: string | null
          heartbeat_at: string | null
          job_id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          logical_priority: string
          numeric_priority: number
          payload: Json
          run_after: string
          status: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          attempt_count?: number
          company_id: string
          correlation_id?: string | null
          created_at?: string
          expires_at?: string | null
          heartbeat_at?: string | null
          job_id?: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          logical_priority?: string
          numeric_priority?: number
          payload?: Json
          run_after?: string
          status?: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          attempt_count?: number
          company_id?: string
          correlation_id?: string | null
          created_at?: string
          expires_at?: string | null
          heartbeat_at?: string | null
          job_id?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          logical_priority?: string
          numeric_priority?: number
          payload?: Json
          run_after?: string
          status?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sys_job_queue_job_type_fkey"
            columns: ["job_type"]
            isOneToOne: false
            referencedRelation: "sys_job_types"
            referencedColumns: ["job_type"]
          },
          {
            foreignKeyName: "sys_job_queue_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "sys_background_workers"
            referencedColumns: ["worker_id"]
          },
        ]
      }
      sys_job_types: {
        Row: {
          created_at: string
          is_enabled: boolean
          job_type: string
          logical_priority: string
          max_attempts: number
          max_concurrency: number | null
          numeric_priority: number
          retry_strategy: string
          timeout_seconds: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_enabled?: boolean
          job_type: string
          logical_priority?: string
          max_attempts?: number
          max_concurrency?: number | null
          numeric_priority?: number
          retry_strategy?: string
          timeout_seconds?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_enabled?: boolean
          job_type?: string
          logical_priority?: string
          max_attempts?: number
          max_concurrency?: number | null
          numeric_priority?: number
          retry_strategy?: string
          timeout_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      sys_notification_queue: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          last_error: string | null
          notification_id: string
          notification_type: string
          payload: Json
          priority: number
          provider: string | null
          provider_message_id: string | null
          read_at: string | null
          recipient: string
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string
          last_error?: string | null
          notification_id?: string
          notification_type?: string
          payload?: Json
          priority?: number
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          last_error?: string | null
          notification_id?: string
          notification_type?: string
          payload?: Json
          priority?: number
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient?: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sys_notification_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sys_notification_templates"
            referencedColumns: ["template_id"]
          },
        ]
      }
      sys_notification_templates: {
        Row: {
          channel: string
          content: string
          created_at: string
          language: string
          name: string
          template_id: string
          version: number
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          language?: string
          name: string
          template_id?: string
          version?: number
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          language?: string
          name?: string
          template_id?: string
          version?: number
        }
        Relationships: []
      }
      sys_workflow_actions: {
        Row: {
          action_id: string
          action_type: string
          created_at: string
          payload: Json
        }
        Insert: {
          action_id?: string
          action_type: string
          created_at?: string
          payload: Json
        }
        Update: {
          action_id?: string
          action_type?: string
          created_at?: string
          payload?: Json
        }
        Relationships: []
      }
      sys_workflow_conditions: {
        Row: {
          condition_id: string
          created_at: string
          rule_payload: Json
          rule_type: string
          transition_id: string
        }
        Insert: {
          condition_id?: string
          created_at?: string
          rule_payload: Json
          rule_type: string
          transition_id: string
        }
        Update: {
          condition_id?: string
          created_at?: string
          rule_payload?: Json
          rule_type?: string
          transition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sys_workflow_conditions_transition_id_fkey"
            columns: ["transition_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_transitions"
            referencedColumns: ["transition_id"]
          },
        ]
      }
      sys_workflow_definitions: {
        Row: {
          calendar_id: string | null
          company_id: string
          created_at: string
          domain: string
          effective_from: string
          effective_to: string | null
          is_active: boolean
          name: string
          template_id: string | null
          updated_at: string
          workflow_id: string
          workflow_version: number
        }
        Insert: {
          calendar_id?: string | null
          company_id: string
          created_at?: string
          domain: string
          effective_from?: string
          effective_to?: string | null
          is_active?: boolean
          name: string
          template_id?: string | null
          updated_at?: string
          workflow_id?: string
          workflow_version?: number
        }
        Update: {
          calendar_id?: string | null
          company_id?: string
          created_at?: string
          domain?: string
          effective_from?: string
          effective_to?: string | null
          is_active?: boolean
          name?: string
          template_id?: string | null
          updated_at?: string
          workflow_id?: string
          workflow_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sys_workflow_definitions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "sys_business_calendars"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "sys_workflow_definitions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_templates"
            referencedColumns: ["template_id"]
          },
        ]
      }
      sys_workflow_history: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          correlation_id: string | null
          duration_in_state_seconds: number | null
          from_state_id: string | null
          history_id: string
          instance_id: string
          occurred_at: string
          reason: string | null
          to_state_id: string | null
          transition_id: string | null
          transition_type: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          correlation_id?: string | null
          duration_in_state_seconds?: number | null
          from_state_id?: string | null
          history_id?: string
          instance_id: string
          occurred_at?: string
          reason?: string | null
          to_state_id?: string | null
          transition_id?: string | null
          transition_type?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          correlation_id?: string | null
          duration_in_state_seconds?: number | null
          from_state_id?: string | null
          history_id?: string
          instance_id?: string
          occurred_at?: string
          reason?: string | null
          to_state_id?: string | null
          transition_id?: string | null
          transition_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sys_workflow_history_from_state_id_fkey"
            columns: ["from_state_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_states"
            referencedColumns: ["state_id"]
          },
          {
            foreignKeyName: "sys_workflow_history_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_instances"
            referencedColumns: ["instance_id"]
          },
          {
            foreignKeyName: "sys_workflow_history_to_state_id_fkey"
            columns: ["to_state_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_states"
            referencedColumns: ["state_id"]
          },
          {
            foreignKeyName: "sys_workflow_history_transition_id_fkey"
            columns: ["transition_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_transitions"
            referencedColumns: ["transition_id"]
          },
        ]
      }
      sys_workflow_instances: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          breached_at: string | null
          company_id: string
          context_data: Json
          created_at: string
          current_state_id: string
          due_at: string | null
          instance_id: string
          parent_instance_id: string | null
          started_by: string | null
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          breached_at?: string | null
          company_id: string
          context_data?: Json
          created_at?: string
          current_state_id: string
          due_at?: string | null
          instance_id?: string
          parent_instance_id?: string | null
          started_by?: string | null
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          breached_at?: string | null
          company_id?: string
          context_data?: Json
          created_at?: string
          current_state_id?: string
          due_at?: string | null
          instance_id?: string
          parent_instance_id?: string | null
          started_by?: string | null
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sys_workflow_instances_current_state_id_fkey"
            columns: ["current_state_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_states"
            referencedColumns: ["state_id"]
          },
          {
            foreignKeyName: "sys_workflow_instances_parent_instance_id_fkey"
            columns: ["parent_instance_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_instances"
            referencedColumns: ["instance_id"]
          },
          {
            foreignKeyName: "sys_workflow_instances_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_definitions"
            referencedColumns: ["workflow_id"]
          },
        ]
      }
      sys_workflow_states: {
        Row: {
          compensation_action_id: string | null
          created_at: string
          escalation_action_id: string | null
          name: string
          sla_minutes: number | null
          state_id: string
          state_type: string
          sub_workflow_id: string | null
          workflow_id: string
        }
        Insert: {
          compensation_action_id?: string | null
          created_at?: string
          escalation_action_id?: string | null
          name: string
          sla_minutes?: number | null
          state_id?: string
          state_type?: string
          sub_workflow_id?: string | null
          workflow_id: string
        }
        Update: {
          compensation_action_id?: string | null
          created_at?: string
          escalation_action_id?: string | null
          name?: string
          sla_minutes?: number | null
          state_id?: string
          state_type?: string
          sub_workflow_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sys_workflow_states_sub_workflow_id_fkey"
            columns: ["sub_workflow_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_definitions"
            referencedColumns: ["workflow_id"]
          },
          {
            foreignKeyName: "sys_workflow_states_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_definitions"
            referencedColumns: ["workflow_id"]
          },
        ]
      }
      sys_workflow_templates: {
        Row: {
          description: string | null
          domain: string
          name: string
          structure: Json
          template_id: string
        }
        Insert: {
          description?: string | null
          domain: string
          name: string
          structure: Json
          template_id?: string
        }
        Update: {
          description?: string | null
          domain?: string
          name?: string
          structure?: Json
          template_id?: string
        }
        Relationships: []
      }
      sys_workflow_transitions: {
        Row: {
          created_at: string
          from_state_id: string
          name: string
          to_state_id: string
          transition_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          from_state_id: string
          name: string
          to_state_id: string
          transition_id?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          from_state_id?: string
          name?: string
          to_state_id?: string
          transition_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sys_workflow_transitions_from_state_id_fkey"
            columns: ["from_state_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_states"
            referencedColumns: ["state_id"]
          },
          {
            foreignKeyName: "sys_workflow_transitions_to_state_id_fkey"
            columns: ["to_state_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_states"
            referencedColumns: ["state_id"]
          },
          {
            foreignKeyName: "sys_workflow_transitions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "sys_workflow_definitions"
            referencedColumns: ["workflow_id"]
          },
        ]
      }
      system_broadcasts: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          message_ar: string
          target: string | null
          target_companies: Json | null
          title_ar: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message_ar: string
          target?: string | null
          target_companies?: Json | null
          title_ar: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message_ar?: string
          target?: string | null
          target_companies?: Json | null
          title_ar?: string
          type?: string | null
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name_ar: string
          name_en: string | null
          percentage: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name_ar: string
          name_en?: string | null
          percentage: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name_ar?: string
          name_en?: string | null
          percentage?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_roles: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_products: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          fitment_status: string
          id: string
          product_id: string
          source: string
          vehicle_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          fitment_status?: string
          id?: string
          product_id: string
          source?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          fitment_status?: string
          id?: string
          product_id?: string
          source?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vehicle_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vehicle_products_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: string | null
          created_at: string
          deleted_at: string | null
          drive_type: string | null
          engine: string | null
          fuel_type: string | null
          id: string
          make: string
          model: string
          region: string | null
          submodel: string | null
          transmission: string | null
          updated_at: string
          vin_prefix: string | null
          year_end: number
          year_start: number
        }
        Insert: {
          body_type?: string | null
          created_at?: string
          deleted_at?: string | null
          drive_type?: string | null
          engine?: string | null
          fuel_type?: string | null
          id?: string
          make: string
          model: string
          region?: string | null
          submodel?: string | null
          transmission?: string | null
          updated_at?: string
          vin_prefix?: string | null
          year_end: number
          year_start: number
        }
        Update: {
          body_type?: string | null
          created_at?: string
          deleted_at?: string | null
          drive_type?: string | null
          engine?: string | null
          fuel_type?: string | null
          id?: string
          make?: string
          model?: string
          region?: string | null
          submodel?: string | null
          transmission?: string | null
          updated_at?: string
          vin_prefix?: string | null
          year_end?: number
          year_start?: number
        }
        Relationships: []
      }
      vin_analyses: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          decoded: Json | null
          id: string
          source: string
          updated_at: string | null
          vehicle_id: string | null
          vin: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          decoded?: Json | null
          id?: string
          source?: string
          updated_at?: string | null
          vehicle_id?: string | null
          vin: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          decoded?: Json | null
          id?: string
          source?: string
          updated_at?: string | null
          vehicle_id?: string | null
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vin_analyses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vin_analyses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_primary: boolean
          location: string | null
          name_ar: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          location?: string | null
          name_ar: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          location?: string | null
          name_ar?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          company_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal_entry_lines_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      active_accounts: {
        Row: {
          account_type: string | null
          balance: number | null
          code: string | null
          company_id: string | null
          created_at: string | null
          currency_code: string | null
          deleted_at: string | null
          id: string | null
          is_active: boolean | null
          is_system: boolean | null
          level: number | null
          name_ar: string | null
          name_en: string | null
          parent_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      active_expenses: {
        Row: {
          amount: number | null
          category_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          deleted_at: string | null
          description: string | null
          exchange_rate: number | null
          expense_date: string | null
          frequency: string | null
          id: string | null
          is_recurring: boolean | null
          payment_method: string | null
          recurring_end_date: string | null
          status: string | null
          updated_at: string | null
          voucher_number: string | null
        }
        Insert: {
          amount?: number | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          expense_date?: string | null
          frequency?: string | null
          id?: string | null
          is_recurring?: boolean | null
          payment_method?: string | null
          recurring_end_date?: string | null
          status?: string | null
          updated_at?: string | null
          voucher_number?: string | null
        }
        Update: {
          amount?: number | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          expense_date?: string | null
          frequency?: string | null
          id?: string | null
          is_recurring?: boolean | null
          payment_method?: string | null
          recurring_end_date?: string | null
          status?: string | null
          updated_at?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      active_invoices: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          deleted_at: string | null
          discount_amount: number | null
          due_date: string | null
          exchange_rate: number | null
          fiscal_year_id: string | null
          id: string | null
          invoice_number: string | null
          issue_date: string | null
          notes: string | null
          paid_amount: number | null
          party_id: string | null
          payment_method: string | null
          reference_invoice_id: string | null
          return_reason: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          fiscal_year_id?: string | null
          id?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          party_id?: string | null
          payment_method?: string | null
          reference_invoice_id?: string | null
          return_reason?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          fiscal_year_id?: string | null
          id?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          party_id?: string | null
          payment_method?: string | null
          reference_invoice_id?: string | null
          return_reason?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_fiscal_year"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
          {
            foreignKeyName: "invoices_reference_invoice_id_fkey"
            columns: ["reference_invoice_id"]
            isOneToOne: false
            referencedRelation: "active_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reference_invoice_id_fkey"
            columns: ["reference_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      active_journal_entries: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          entry_date: string | null
          entry_number: number | null
          id: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_date?: string | null
          entry_number?: number | null
          id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_date?: string | null
          entry_number?: number | null
          id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_parties: {
        Row: {
          address: string | null
          avg_rating: number | null
          birth_date: string | null
          category_id: string | null
          commercial_registration: string | null
          company_id: string | null
          created_at: string | null
          credit_limit: number | null
          customer_since: string | null
          customer_type: string | null
          deleted_at: string | null
          delivery_lead_days: number | null
          email: string | null
          id: string | null
          is_active_supplier: boolean | null
          last_contact_date: string | null
          last_invoice_date: string | null
          last_purchase_date: string | null
          lead_source: string | null
          loyalty_points: number | null
          min_order_amount: number | null
          name: string | null
          payment_terms_days: number | null
          phone: string | null
          preferred_contact_method: string | null
          satisfaction_score: number | null
          search_vector: unknown
          status: string | null
          supplier_type: string | null
          tax_number: string | null
          total_invoices_count: number | null
          total_orders_count: number | null
          total_paid_amount: number | null
          total_purchases_amount: number | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          avg_rating?: number | null
          birth_date?: string | null
          category_id?: string | null
          commercial_registration?: string | null
          company_id?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_since?: string | null
          customer_type?: string | null
          deleted_at?: string | null
          delivery_lead_days?: number | null
          email?: string | null
          id?: string | null
          is_active_supplier?: boolean | null
          last_contact_date?: string | null
          last_invoice_date?: string | null
          last_purchase_date?: string | null
          lead_source?: string | null
          loyalty_points?: number | null
          min_order_amount?: number | null
          name?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          preferred_contact_method?: string | null
          satisfaction_score?: number | null
          search_vector?: unknown
          status?: string | null
          supplier_type?: string | null
          tax_number?: string | null
          total_invoices_count?: number | null
          total_orders_count?: number | null
          total_paid_amount?: number | null
          total_purchases_amount?: number | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          avg_rating?: number | null
          birth_date?: string | null
          category_id?: string | null
          commercial_registration?: string | null
          company_id?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_since?: string | null
          customer_type?: string | null
          deleted_at?: string | null
          delivery_lead_days?: number | null
          email?: string | null
          id?: string | null
          is_active_supplier?: boolean | null
          last_contact_date?: string | null
          last_invoice_date?: string | null
          last_purchase_date?: string | null
          lead_source?: string | null
          loyalty_points?: number | null
          min_order_amount?: number | null
          name?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          preferred_contact_method?: string | null
          satisfaction_score?: number | null
          search_vector?: unknown
          status?: string | null
          supplier_type?: string | null
          tax_number?: string | null
          total_invoices_count?: number | null
          total_orders_count?: number | null
          total_paid_amount?: number | null
          total_purchases_amount?: number | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "party_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      active_payments: {
        Row: {
          account_id: string | null
          amount: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          deleted_at: string | null
          exchange_rate: number | null
          id: string | null
          notes: string | null
          party_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_number: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          exchange_rate?: number | null
          id?: string | null
          notes?: string | null
          party_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_number?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          deleted_at?: string | null
          exchange_rate?: number | null
          id?: string | null
          notes?: string | null
          party_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_number?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "active_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      active_products: {
        Row: {
          alternative_numbers: string | null
          barcode: string | null
          brand: string | null
          category_id: string | null
          company_id: string | null
          core_charge_amount: number | null
          cost_price: number | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          has_core_charge: boolean | null
          id: string | null
          image_url: string | null
          is_kit: boolean | null
          location: string | null
          min_stock_level: number | null
          name_ar: string | null
          part_number: string | null
          purchase_price: number | null
          sale_price: number | null
          size: string | null
          sku: string | null
          specifications: string | null
          status: string | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          alternative_numbers?: string | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          company_id?: string | null
          core_charge_amount?: number | null
          cost_price?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          has_core_charge?: boolean | null
          id?: string | null
          image_url?: string | null
          is_kit?: boolean | null
          location?: string | null
          min_stock_level?: number | null
          name_ar?: string | null
          part_number?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          size?: string | null
          sku?: string | null
          specifications?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          alternative_numbers?: string | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          company_id?: string | null
          core_charge_amount?: number | null
          cost_price?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          has_core_charge?: boolean | null
          id?: string | null
          image_url?: string | null
          is_kit?: boolean | null
          location?: string | null
          min_stock_level?: number | null
          name_ar?: string | null
          part_number?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          size?: string | null
          sku?: string | null
          specifications?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_alert: {
        Row: {
          brand: string | null
          category_id: string | null
          category_name: string | null
          company_id: string | null
          current_quantity: number | null
          min_stock_level: number | null
          part_number: string | null
          product_id: string | null
          product_name: string | null
          purchase_price: number | null
          shortage: number | null
          sku: string | null
          status: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_stock_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      party_balances: {
        Row: {
          balance: number | null
          company_id: string | null
          party_id: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      party_balances_by_currency: {
        Row: {
          balance: number | null
          company_id: string | null
          currency_code: string | null
          last_activity_date: string | null
          party_id: string | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal_entry_lines_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "active_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party_balances"
            referencedColumns: ["party_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          role: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_company_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_income_statement: {
        Row: {
          cogs: number | null
          company_id: string | null
          gross_profit: number | null
          net_margin_pct: number | null
          net_profit: number | null
          operating_expenses: number | null
          total_expenses_including_cogs: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal_entry_lines_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_inventory_summary: {
        Row: {
          company_id: string | null
          cost_value: number | null
          margin_pct: number | null
          name_ar: string | null
          product_id: string | null
          sale_value: number | null
          sku: string | null
          total_qty: number | null
          unit_cost: number | null
          unit_price: number | null
          warehouse_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_stock_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_inventory_valuation: {
        Row: {
          company_id: string | null
          cost_price: number | null
          name_ar: string | null
          part_number: string | null
          product_id: string | null
          total_quantity: number | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_sys_event_bus_health: {
        Row: {
          avg_processing_time_seconds_24h: number | null
          company_id: string | null
          dead_letter_events: number | null
          failed_events: number | null
          pending_events: number | null
          processed_last_24h: number | null
          processing_events: number | null
        }
        Relationships: []
      }
      vw_sys_infrastructure_metrics: {
        Row: {
          active_workers: number | null
          avg_workflow_duration_seconds: number | null
          dlq_count: number | null
          event_lag: number | null
          failed_jobs: number | null
          notification_failures: number | null
          pending_jobs_queue_depth: number | null
        }
        Relationships: []
      }
      vw_sys_queue_metrics: {
        Row: {
          completed_last_24h: number | null
          dead_letter_jobs: number | null
          failed_jobs: number | null
          job_type: string | null
          pending_jobs: number | null
          processing_jobs: number | null
          retrying_jobs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sys_job_queue_job_type_fkey"
            columns: ["job_type"]
            isOneToOne: false
            referencedRelation: "sys_job_types"
            referencedColumns: ["job_type"]
          },
        ]
      }
      vw_sys_workflow_metrics: {
        Row: {
          active_instances: number | null
          avg_duration_seconds: number | null
          company_id: string | null
          completed_instances: number | null
          failed_instances: number | null
          sla_breaches: number | null
          workflow_name: string | null
        }
        Relationships: []
      }
      vw_trial_balance: {
        Row: {
          account_type: string | null
          code: string | null
          company_id: string | null
          name_ar: string | null
          net_balance: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_vin_parts_to_inventory: {
        Args: { p_company_id: string; p_parts: Json; p_vehicle: Json }
        Returns: number
      }
      admin_recalculate_all_stock: {
        Args: { p_company_id: string }
        Returns: Json
      }
      api_v1_fin_generate_grn_je: {
        Args: { p_company_id: string; p_created_by: string; p_grn_id: string }
        Returns: Json
      }
      api_v1_fin_post_journal_entry: {
        Args: {
          p_company_id: string
          p_created_by?: string
          p_description: string
          p_force_post?: boolean
          p_journal_date: string
          p_lines: Json
          p_reference_id: string
          p_reference_type: string
        }
        Returns: Json
      }
      api_v1_inv_create_warehouse: {
        Args: {
          p_branch_id?: string
          p_code: string
          p_company_id: string
          p_location?: string
          p_name_ar: string
          p_name_en?: string
        }
        Returns: Json
      }
      api_v1_inv_record_movement: {
        Args: {
          p_company_id: string
          p_created_by?: string
          p_items: Json
          p_movement_type: Database["public"]["Enums"]["inv_movement_type"]
          p_notes?: string
          p_reference_id: string
          p_reference_type: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      api_v1_prc_accept_grn: {
        Args: { p_accepted_by: string; p_company_id: string; p_grn_id: string }
        Returns: Json
      }
      api_v1_prc_act_on_pr: {
        Args: {
          p_action: string
          p_actor_id: string
          p_company_id: string
          p_notes?: string
          p_pr_id: string
        }
        Returns: Json
      }
      api_v1_prc_add_supplier_product: {
        Args: {
          p_company_id: string
          p_lead_time_days?: number
          p_moq?: number
          p_order_multiple?: number
          p_preferred_supplier?: boolean
          p_priority?: number
          p_product_id: string
          p_supplier_id: string
          p_supplier_sku?: string
        }
        Returns: Json
      }
      api_v1_prc_approve_supplier: {
        Args: {
          p_approved: boolean
          p_approved_by: string
          p_company_id: string
          p_rejection_reason?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      api_v1_prc_approve_variance: {
        Args: {
          p_approved_by: string
          p_company_id: string
          p_invoice_id: string
          p_match_id: string
          p_resolution_notes: string
        }
        Returns: Json
      }
      api_v1_prc_award_rfq: {
        Args: {
          p_awarded_by: string
          p_company_id: string
          p_evaluation_id: string
          p_justification?: string
          p_selected_quotation_id?: string
          p_split_awards?: Json
        }
        Returns: Json
      }
      api_v1_prc_block_supplier: {
        Args: {
          p_action: string
          p_blocked_by: string
          p_company_id: string
          p_reason: string
          p_supplier_id: string
        }
        Returns: Json
      }
      api_v1_prc_calculate_ranking: {
        Args: {
          p_company_id: string
          p_delivery_weight?: number
          p_evaluation_id: string
          p_price_weight?: number
          p_technical_weight?: number
        }
        Returns: Json
      }
      api_v1_prc_calculate_supplier_metrics: {
        Args: {
          p_company_id: string
          p_period_end: string
          p_period_start: string
          p_supplier_id: string
        }
        Returns: Json
      }
      api_v1_prc_cancel_po: {
        Args: {
          p_cancelled_by: string
          p_company_id: string
          p_po_id: string
          p_reason?: string
        }
        Returns: Json
      }
      api_v1_prc_cancel_pr: {
        Args: {
          p_cancelled_by: string
          p_company_id: string
          p_pr_id: string
          p_reason?: string
        }
        Returns: Json
      }
      api_v1_prc_close_rfq: {
        Args: { p_closed_by?: string; p_company_id: string; p_rfq_id: string }
        Returns: Json
      }
      api_v1_prc_create_grn: {
        Args: {
          p_company_id: string
          p_delivery_note_number?: string
          p_items?: Json
          p_notes?: string
          p_po_id: string
          p_received_by: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      api_v1_prc_create_po_from_quotation: {
        Args: {
          p_buyer_id: string
          p_company_id: string
          p_expected_delivery_date?: string
          p_notes?: string
          p_quotation_id: string
          p_shipping_terms?: string
        }
        Returns: Json
      }
      api_v1_prc_create_pr: {
        Args: {
          p_company_id: string
          p_currency?: string
          p_department_id?: string
          p_items?: Json
          p_justification?: string
          p_priority?: string
          p_requester_id: string
          p_required_date?: string
        }
        Returns: Json
      }
      api_v1_prc_create_rfq: {
        Args: {
          p_buyer_id: string
          p_company_id: string
          p_delivery_date?: string
          p_items?: Json
          p_pr_id?: string
          p_submission_deadline: string
          p_terms_and_conditions?: string
          p_title: string
        }
        Returns: Json
      }
      api_v1_prc_create_supplier: {
        Args: {
          p_category_id?: string
          p_city?: string
          p_commercial_registration?: string
          p_company_id: string
          p_country?: string
          p_currency?: string
          p_initial_rating?: number
          p_legal_name: string
          p_supplier_type?: string
          p_tax_number?: string
          p_trade_name?: string
          p_vat_number?: string
          p_website?: string
        }
        Returns: Json
      }
      api_v1_prc_instantiate_pr_workflow: {
        Args: { p_company_id: string }
        Returns: string
      }
      api_v1_prc_invite_supplier_to_rfq: {
        Args: {
          p_company_id: string
          p_invited_by: string
          p_rfq_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      api_v1_prc_issue_po: {
        Args: { p_company_id: string; p_issued_by: string; p_po_id: string }
        Returns: Json
      }
      api_v1_prc_publish_rfq: {
        Args: {
          p_company_id: string
          p_published_by: string
          p_rfq_id: string
          p_supplier_ids?: string[]
        }
        Returns: Json
      }
      api_v1_prc_record_supplier_document: {
        Args: {
          p_company_id: string
          p_document_type: string
          p_expiry_date?: string
          p_file_url: string
          p_issue_date?: string
          p_reminder_days?: number[]
          p_supplier_id: string
          p_title: string
          p_uploaded_by?: string
        }
        Returns: Json
      }
      api_v1_prc_run_three_way_match: {
        Args: {
          p_company_id: string
          p_invoice_id: string
          p_matched_by: string
        }
        Returns: Json
      }
      api_v1_prc_schedule_analytics_job: {
        Args: { p_company_id: string; p_scheduled_by?: string }
        Returns: Json
      }
      api_v1_prc_score_quotation: {
        Args: {
          p_company_id: string
          p_delivery_score: number
          p_evaluation_id: string
          p_price_score: number
          p_quotation_id: string
          p_technical_score: number
        }
        Returns: Json
      }
      api_v1_prc_start_evaluation: {
        Args: { p_company_id: string; p_evaluator_id: string; p_rfq_id: string }
        Returns: Json
      }
      api_v1_prc_submit_pr: {
        Args: { p_company_id: string; p_pr_id: string; p_submitted_by: string }
        Returns: Json
      }
      api_v1_prc_submit_quotation: {
        Args: {
          p_company_id: string
          p_currency?: string
          p_delivery_lead_time_days?: number
          p_items?: Json
          p_notes?: string
          p_payment_terms?: string
          p_rfq_id: string
          p_supplier_id: string
          p_valid_until?: string
        }
        Returns: Json
      }
      api_v1_prc_submit_supplier_approval: {
        Args: {
          p_company_id: string
          p_submitted_by: string
          p_supplier_id: string
        }
        Returns: Json
      }
      api_v1_prc_update_supplier_scores: {
        Args: {
          p_company_id: string
          p_period_end: string
          p_period_start: string
          p_supplier_id: string
        }
        Returns: Json
      }
      api_v1_prc_update_supplier_terms: {
        Args: {
          p_company_id: string
          p_credit_days?: number
          p_credit_limit?: number
          p_delivery_method?: string
          p_incoterm?: string
          p_payment_terms: string
          p_penalty_rules?: string
          p_return_policy?: string
          p_shipping_terms?: string
          p_supplier_id: string
          p_warranty_terms?: string
        }
        Returns: Json
      }
      api_v1_prc_upsert_supplier_price: {
        Args: {
          p_company_id: string
          p_currency?: string
          p_discount?: number
          p_effective_from?: string
          p_effective_to?: string
          p_minimum_quantity?: number
          p_supplier_product_id: string
          p_tax_percentage?: number
          p_unit_price: number
        }
        Returns: Json
      }
      api_v1_sys_enqueue_job: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_job_type: string
          p_payload: Json
          p_run_after?: string
        }
        Returns: string
      }
      api_v1_sys_is_feature_enabled: {
        Args: {
          p_company_id?: string
          p_flag_name: string
          p_role?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      api_v1_sys_publish_event: {
        Args: {
          p_actor_id?: string
          p_actor_type?: string
          p_aggregate_id: string
          p_aggregate_type: string
          p_company_id: string
          p_correlation_id?: string
          p_event_type: string
          p_payload: Json
        }
        Returns: string
      }
      api_v1_sys_worker_heartbeat: {
        Args: { p_worker_id: string }
        Returns: undefined
      }
      assemble_kit: {
        Args: {
          p_company_id: string
          p_kit_product_id: string
          p_quantity: number
          p_user_id: string
          p_warehouse_id: string
        }
        Returns: undefined
      }
      assert_account_belongs_to_company: {
        Args: {
          p_account_id: string
          p_company_id: string
          p_param_name?: string
        }
        Returns: undefined
      }
      assert_party_belongs_to_company: {
        Args: {
          p_company_id: string
          p_param_name?: string
          p_party_id: string
        }
        Returns: undefined
      }
      assert_product_belongs_to_company: {
        Args: {
          p_company_id: string
          p_param_name?: string
          p_product_id: string
        }
        Returns: undefined
      }
      auto_journal_from_invoice: {
        Args: { p_invoice_id: string }
        Returns: string
      }
      break_overdue_promises: {
        Args: { p_company_id: string }
        Returns: string[]
      }
      bulk_adjust_stock: {
        Args: {
          p_adjustments: Json
          p_company_id: string
          p_reason?: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      bulk_update_product_prices: {
        Args: { p_company_id: string; p_updates: Json }
        Returns: Json
      }
      calculate_product_cogs: {
        Args: { p_company_id: string; p_product_id: string }
        Returns: {
          avg_cost_sar: number
          cogs_sar: number
          current_stock: number
          product_id: string
          product_name: string
          qty_sold: number
          stock_value_sar: number
          total_cost_sar: number
          total_purchased: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_company_id: string
          p_endpoint: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      check_stock_availability: {
        Args: {
          p_product_id: string
          p_requested_qty: number
          p_warehouse_id: string
        }
        Returns: boolean
      }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_records: { Args: never; Returns: undefined }
      commit_expense_v2: {
        Args: { p_company_id: string; p_data: Json; p_user_id: string }
        Returns: Json
      }
      commit_payment: {
        Args: {
          p_amount: number
          p_branch_id?: string
          p_cash_account_id: string
          p_company_id: string
          p_counterparty_id?: string
          p_counterparty_type?: string
          p_currency_code?: string
          p_date: string
          p_description?: string
          p_exchange_rate?: number
          p_foreign_amount?: number
          p_payment_method?: string
          p_reference_number?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      commit_purchase_invoice: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_currency?: string
          p_due_date?: string
          p_exchange_rate?: number
          p_invoice_number?: string
          p_issue_date?: string
          p_items: Json
          p_notes?: string
          p_payment_account_id?: string
          p_payment_method?: string
          p_supplier_id: string
          p_user_id: string
        }
        Returns: Json
      }
      commit_purchase_return: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_currency: string
          p_exchange_rate: number
          p_items: Json
          p_notes: string
          p_return_reason?: string
          p_supplier_id: string
          p_user_id: string
        }
        Returns: Json
      }
      commit_sale_return: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_currency?: string
          p_exchange_rate?: number
          p_items: Json
          p_notes?: string
          p_party_id: string
          p_reference_invoice_id?: string
          p_return_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      commit_sales_invoice_v2: {
        Args: {
          p_branch_id?: string
          p_currency_code?: string
          p_due_date: string
          p_exchange_rate?: number
          p_idempotency_key?: string
          p_invoice_date: string
          p_items: Json
          p_notes?: string
          p_party_id?: string | null
          p_payment_account_id?: string
          p_payment_type?: string
        }
        Returns: string
      }
      complete_promise: {
        Args: {
          p_company_id: string
          p_payment_id?: string
          p_promise_id: string
        }
        Returns: undefined
      }
      convert_quotation_to_invoice: {
        Args: {
          p_due_date?: string
          p_issue_date?: string
          p_notes?: string
          p_quotation_id: string
        }
        Returns: string
      }
      convert_quotation_to_po_transactional: {
        Args: {
          p_company_id: string
          p_expected_delivery_date?: string
          p_notes?: string
          p_quotation_id: string
        }
        Returns: Json
      }
      create_cashbox: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_currency_code?: string
          p_name?: string
          p_opening_balance?: number
        }
        Returns: Json
      }
      create_exchange_company: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_currency_code?: string
          p_name?: string
          p_opening_balance?: number
        }
        Returns: Json
      }
      create_financial_bond: {
        Args: {
          p_amount: number
          p_bond_type: string
          p_branch_id?: string
          p_cash_account_id?: string
          p_company_id: string
          p_counterparty_id?: string
          p_counterparty_type?: string
          p_currency_code?: string
          p_date?: string
          p_description?: string
          p_exchange_rate?: number
          p_foreign_amount?: number
          p_invoice_id?: string
          p_payment_method?: string
          p_user_id?: string
        }
        Returns: Json
      }
      create_stock_transfer: {
        Args: {
          p_company_id: string
          p_from_warehouse: string
          p_items: Json
          p_notes?: string
          p_to_warehouse: string
          p_user_id: string
        }
        Returns: Json
      }
      disassemble_kit: {
        Args: {
          p_company_id: string
          p_kit_product_id: string
          p_quantity: number
          p_user_id: string
          p_warehouse_id: string
        }
        Returns: undefined
      }
      ensure_vehicle: {
        Args: {
          p_body_type?: string
          p_drive_type?: string
          p_engine?: string
          p_fuel_type?: string
          p_make: string
          p_model?: string
          p_region?: string
          p_transmission?: string
          p_year?: number
        }
        Returns: string
      }
      finalize_audit_session: {
        Args: { p_items: Json; p_session_id: string; p_user_id: string }
        Returns: Json
      }
      fn_accounting_health_check: {
        Args: never
        Returns: {
          check_name: string
          details: string
          issue_count: number
          severity: string
        }[]
      }
      fn_assert_company_access: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      fn_get_account_id: {
        Args: { p_code: string; p_company_id: string }
        Returns: string
      }
      fn_get_default_cash_account: {
        Args: { p_company_id: string; p_currency?: string }
        Returns: string
      }
      fn_post_inventory_movement: {
        Args: {
          p_company_id: string
          p_created_by: string
          p_product_id: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
          p_transaction_type: string
          p_unit_cost?: number
          p_warehouse_id: string
        }
        Returns: string
      }
      fn_release_payment_allocations: {
        Args: { p_invoice_id?: string; p_payment_id?: string }
        Returns: undefined
      }
      fn_reverse_inventory_for_reference: {
        Args: {
          p_new_reference_type: string
          p_reference_id: string
          p_source_reference_types: string[]
        }
        Returns: undefined
      }
      fn_reverse_journal_entries: {
        Args: {
          p_company_id: string
          p_created_by: string
          p_description_prefix: string
          p_new_reference_type: string
          p_source_reference_id: string
          p_source_reference_types: string[]
        }
        Returns: string[]
      }
      generate_invoice_number: {
        Args: { p_company_id: string; p_type: string }
        Returns: string
      }
      generate_payment_number: {
        Args: { p_company_id: string; p_type: string }
        Returns: string
      }
      get_account_ledger: {
        Args: {
          p_account_id: string
          p_branch_id?: string
          p_company_id: string
          p_from?: string
          p_to?: string
        }
        Returns: Json
      }
      get_all_parties: {
        Args: { p_company_id: string; p_status?: string; p_type?: string }
        Returns: {
          address: string
          avg_rating: number
          balance: number
          category_id: string
          category_name: string
          company_id: string
          created_at: string
          credit_limit: number
          customer_since: string
          customer_type: string
          delivery_lead_days: number
          email: string
          id: string
          is_active_supplier: boolean
          last_invoice_date: string
          last_purchase_date: string
          lead_source: string
          loyalty_points: number
          min_order_amount: number
          name: string
          payment_terms_days: number
          phone: string
          preferred_contact_method: string
          status: string
          supplier_type: string
          tax_number: string
          total_invoices_count: number
          total_orders_count: number
          total_paid_amount: number
          total_purchases_amount: number
          type: string
          updated_at: string
        }[]
      }
      get_all_products: {
        Args: {
          p_company_id: string
          p_status?: string
          p_warehouse_id?: string
        }
        Returns: {
          alternative_numbers: string
          barcode: string
          brand: string
          category_id: string
          category_name: string
          company_id: string
          core_charge_amount: number
          cost_price: number
          created_at: string
          deleted_at: string
          description: string
          has_core_charge: boolean
          id: string
          image_url: string
          is_kit: boolean
          location: string
          min_stock_level: number
          name_ar: string
          part_number: string
          purchase_price: number
          sale_price: number
          size: string
          sku: string
          specifications: string
          status: string
          total_quantity: number
          unit: string
          updated_at: string
          warehouse_quantities: Json
        }[]
      }
      get_auth_companies: { Args: never; Returns: string[] }
      get_auth_company_id: { Args: never; Returns: string }
      get_bonds_stats: {
        Args: { p_branch_id?: string; p_company_id: string }
        Returns: Json
      }
      get_cash_account: {
        Args: { p_company_id: string; p_currency: string; p_method: string }
        Returns: string
      }
      get_cash_liquidity: { Args: { p_company_id: string }; Returns: number }
      get_changes_since: {
        Args: { p_company_id: string; p_since: string; p_tables?: string[] }
        Returns: Json
      }
      get_company_settings: { Args: { p_company_id: string }; Returns: Json }
      get_customer_stats: { Args: { p_company_id: string }; Returns: Json }
      get_dashboard_summary:
        | {
            Args: { p_branch_id?: string; p_company_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_branch_id?: string
              p_company_id: string
              p_date_from?: string
              p_date_to?: string
            }
            Returns: Json
          }
      get_dashboard_totals: {
        Args: { p_branch_id?: string; p_company_id: string }
        Returns: Json
      }
      get_dead_stock: {
        Args: {
          days_threshold?: number
          p_company_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          cost_price: number
          days_since_last_sale: number
          id: string
          last_sale_date: string
          name_ar: string
          part_number: string
          sku: string
          stock_quantity: number
          total_value: number
        }[]
      }
      get_debt_analytics_summary: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_debt_followup_dashboard: {
        Args: {
          p_company_id: string
          p_critical_days?: number
          p_due_soon_days?: number
          p_reminder_window_days?: number
        }
        Returns: {
          category: string
          classification: string
          credit_limit: number
          currency_code: string
          days_overdue: number
          has_broken_promise: boolean
          invoice_count: number
          last_contact_date: string
          last_reminded_at: string
          next_due_date: string
          oldest_due_date: string
          opening_balance: number
          outstanding_balance: number
          overdue_amount: number
          party_id: string
          party_name: string
          party_phone: string
          pending_promise_amount: number
          pending_promise_count: number
          pending_promise_date: string
          reminder_status: string
        }[]
      }
      get_debt_party_overview: {
        Args: { p_company_id: string; p_party_id: string }
        Returns: {
          category: string
          credit_limit: number
          due_today_amount: number
          has_broken_promise: boolean
          invoice_count: number
          last_contact_date: string
          last_reminded_at: string
          opening_balance: number
          overdue_amount: number
          party_id: string
          party_name: string
          party_phone: string
          pending_promise_amount: number
          pending_promise_count: number
          total_outstanding: number
        }[]
      }
      get_debt_today_tasks: {
        Args: { p_company_id: string }
        Returns: {
          amount: number
          currency_code: string
          party_id: string
          party_name: string
          party_phone: string
          reference_info: string
          task_type: string
          urgency: string
        }[]
      }
      get_expense_categories_summary: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: {
          category_name: string
          total_amount: number
        }[]
      }
      get_expense_stats: { Args: { p_company_id: string }; Returns: Json }
      get_inventory_valuation: { Args: { p_company_id: string }; Returns: Json }
      get_invoice_with_items: { Args: { p_invoice_id: string }; Returns: Json }
      get_item_movements_with_balance: {
        Args: { p_company_id: string; p_product_id: string }
        Returns: {
          balance_after: number
          date: string
          document_number: string
          id: string
          notes: string
          original_type: string
          quantity: number
          raw_quantity: number
          reference_type: string
          source_name: string
          source_user: string
          transaction_type: string
        }[]
      }
      get_low_stock_products: {
        Args: { p_branch_id?: string; p_company_id: string }
        Returns: {
          id: string
          min_quantity: number
          name_ar: string
          quantity: number
        }[]
      }
      get_matching_inventory_products: {
        Args: {
          p_company_id: string
          p_vehicle_make: string
          p_vehicle_model?: string
          p_year?: number
        }
        Returns: Json
      }
      get_monthly_performance: {
        Args: { p_branch_id?: string; p_company_id: string; p_year: number }
        Returns: {
          expenses: number
          month_index: number
          month_name: string
          revenues: number
        }[]
      }
      get_next_invoice_number: {
        Args: { p_company_id: string; p_type?: string }
        Returns: string
      }
      get_next_journal_entry_number: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_next_sequence: {
        Args: { p_company_id: string; p_sequence_name: string }
        Returns: string
      }
      /**
       * [PRE-DECLARED] Pending `supabase gen types` regeneration after
       * migration 20260826000012_report_profit_loss_detailed.sql is applied.
       */
      report_profit_loss_detailed: {
        Args: { p_company_id: string; p_from: string; p_to: string; p_branch_id?: string | null | undefined }
        Returns: Array<{
          account_id: string
          account_code: string
          account_name: string
          account_type: string
          total_debit: number
          total_credit: number
          balance: number
        }>
      }
      /**
       * [PRE-DECLARED] Pending `supabase gen types` regeneration after
       * migration 20260826000013_restore_company_data_atomic.sql is applied.
       */
      restore_company_data: {
        Args: { p_company_id: string; p_payload: Json }
        Returns: Array<{ t_name: string; rows_count: number }>
      }
      get_overdue_invoices: {
        Args: { p_company_id: string; p_type?: string }
        Returns: {
          aging_bucket: string
          currency_code: string
          days_overdue: number
          due_date: string
          invoice_id: string
          invoice_number: string
          issue_date: string
          paid_amount: number
          party_id: string
          party_name: string
          party_phone: string
          remaining: number
          total_amount: number
        }[]
      }
      get_paginated_invoices: {
        Args: {
          p_company_id: string
          p_from_date?: string
          p_order_by?: string
          p_order_dir?: string
          p_page?: number
          p_page_size?: number
          p_party_id?: string
          p_search?: string
          p_status?: string
          p_to_date?: string
          p_type?: string
        }
        Returns: Json
      }
      get_party_all_balances: {
        Args: { p_company_id: string; p_party_id: string }
        Returns: {
          balance: number
          currency_code: string
          last_activity_date: string
          party_id: string
          transaction_count: number
        }[]
      }
      get_party_balance_by_currency: {
        Args: {
          p_company_id: string
          p_currency_code: string
          p_party_id: string
        }
        Returns: {
          balance: number
          currency_code: string
          last_activity_date: string
          party_id: string
          transaction_count: number
        }[]
      }
      get_party_statement: {
        Args: { p_company_id: string; p_party_id: string }
        Returns: Json
      }
      get_party_summary: { Args: { p_party_id: string }; Returns: Json }
      get_popular_products: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          barcode: string
          brand: string
          category_name: string
          cost_price: number
          id: string
          image_url: string
          min_stock_level: number
          name_ar: string
          part_number: string
          sale_price: number
          sales_count: number
          sku: string
          status: string
          total_stock: number
        }[]
      }
      get_potential_duplicates: {
        Args: { p_company_id: string; p_type?: string }
        Returns: {
          id1: string
          id2: string
          name1: string
          name2: string
          phone1: string
          phone2: string
          similarity: number
        }[]
      }
      get_product_analytics: {
        Args: { p_company_id: string; p_days?: number; p_product_id: string }
        Returns: {
          avg_sale_price: number
          current_stock: number
          gross_profit: number
          total_cost: number
          total_purchased: number
          total_revenue: number
          total_sold: number
          transaction_count: number
        }[]
      }
      get_product_fitment: {
        Args: { p_company_id: string; p_id: string }
        Returns: {
          fitment_id: string
          make: string
          model: string
          notes: string
          submodel: string
          vehicle_id: string
          year_end: number
          year_start: number
        }[]
      }
      get_product_stock_history: {
        Args: {
          p_company_id: string
          p_from_date?: string
          p_limit?: number
          p_product_id: string
          p_to_date?: string
          p_warehouse_id?: string
        }
        Returns: {
          created_by: string
          id: string
          invoice_number: string
          quantity: number
          reference_id: string
          reference_type: string
          running_balance: number
          transaction_date: string
          transaction_type: string
          warehouse_id: string
          warehouse_name: string
        }[]
      }
      get_products_page: {
        Args: {
          p_category_id?: string
          p_company_id: string
          p_low_stock?: boolean
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      get_purchase_stats: {
        Args: { p_branch_id?: string; p_company_id: string }
        Returns: Json
      }
      get_sales_analytics: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_sales_chart_data: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: {
          date: string
          expenses: number
          name: string
          profit: number
          purchases: number
          sales: number
          value: number
        }[]
      }
      get_sales_stats: { Args: { p_company_id: string }; Returns: Json }
      get_similar_products: {
        Args: { p_company_id: string; p_name: string }
        Returns: {
          id: string
          name_ar: string
          similarity_score: number
        }[]
      }
      get_stock_valuation: { Args: { p_company_id: string }; Returns: Json }
      get_top_customers_by_revenue: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          id: string
          invoice_count: number
          name: string
          total_revenue: number
        }[]
      }
      get_top_products_and_customers: {
        Args: { p_branch_id?: string; p_company_id: string; p_limit?: number }
        Returns: {
          top_customers: Json
          top_products: Json
        }[]
      }
      get_top_selling_products: {
        Args: { p_company_id: string; p_days?: number; p_limit?: number }
        Returns: {
          category_id: string
          gross_profit: number
          id: string
          name_ar: string
          sku: string
          total_cost: number
          total_revenue: number
          total_sold: number
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_permissions:
        | { Args: never; Returns: { permission: string }[] }
        | { Args: { p_company_id: string }; Returns: { permission: string }[] }
      get_user_profile: { Args: { p_user_id?: string }; Returns: Json }
      get_user_role:
        | { Args: never; Returns: string }
        | { Args: { p_company_id: string }; Returns: string }
      get_vehicle_products: {
        Args: { p_company_id: string; v_id: string }
        Returns: {
          fitment_id: string
          name: string
          notes: string
          part_number: string
          price: number
          product_id: string
          sku: string
          total_stock: number
        }[]
      }
      get_warehouses_with_stats: {
        Args: { p_branch_id?: string; p_company_id: string }
        Returns: {
          id: string
          itemCount: number
          location: string
          name_ar: string
          stockValue: number
          totalStock: number
        }[]
      }
      has_permission:
        | { Args: { p_permission: string }; Returns: boolean }
        | {
            Args: { p_company_id: string; p_permission: string }
            Returns: boolean
          }
      incentive_actor: { Args: { p_company_id: string }; Returns: string }
      incentive_apply_adjustment: {
        Args: {
          p_adjustment_type: string
          p_amount: number
          p_calculation_id: string
          p_company_id: string
          p_reason: string
        }
        Returns: string
      }
      incentive_approve_invoice_allocation: {
        Args: { p_company_id: string; p_invoice_id: string }
        Returns: undefined
      }
      incentive_assert_period_allows: {
        Args: { p_action: string; p_period_id: string }
        Returns: undefined
      }
      incentive_calculate_period: {
        Args: { p_company_id: string; p_period_id: string }
        Returns: number
      }
      incentive_check_allocation_complete: {
        Args: { p_invoice_id: string }
        Returns: boolean
      }
      incentive_create_assignment: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_effective_from: string
          p_effective_to?: string
          p_plan_id: string
          p_user_id: string
        }
        Returns: string
      }
      incentive_create_engineer_link: {
        Args: {
          p_allocation_pct: number
          p_assignment_type?: string
          p_company_id: string
          p_invoice_id: string
          p_reason?: string
          p_source?: string
          p_user_id: string
        }
        Returns: string
      }
      incentive_create_plan: {
        Args: {
          p_calculation_basis: string
          p_collection_mode?: string
          p_company_id: string
          p_currency_code: string
          p_description?: string
          p_effective_from?: string
          p_effective_to?: string
          p_name: string
          p_tier_currency_code?: string
          p_tier_method?: string
        }
        Returns: string
      }
      incentive_create_rule: {
        Args: {
          p_calculation_method: string
          p_company_id: string
          p_conditions?: Json
          p_fixed_amount?: number
          p_name: string
          p_plan_id: string
          p_priority?: number
          p_rate?: number
          p_rule_type: string
          p_threshold_max?: number
          p_threshold_min?: number
        }
        Returns: string
      }
      incentive_create_target: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_currency_code: string
          p_period_end: string
          p_period_start: string
          p_period_type?: string
          p_target_owner_id: string
          p_target_owner_type: string
          p_target_scope: string
          p_target_type: string
          p_target_value: number
          p_user_id?: string
        }
        Returns: string
      }
      incentive_deactivate_assignment: {
        Args: { p_assignment_id: string; p_company_id: string }
        Returns: undefined
      }
      incentive_deactivate_target: {
        Args: { p_company_id: string; p_target_id: string }
        Returns: undefined
      }
      incentive_detect_pending_invoices: {
        Args: { p_branch_id?: string; p_company_id: string }
        Returns: number
      }
      incentive_detect_pending_invoices_system: { Args: never; Returns: number }
      incentive_log_audit: {
        Args: {
          p_action: string
          p_company_id: string
          p_details?: Json
          p_entity: string
          p_entity_id?: string
        }
        Returns: undefined
      }
      incentive_mark_pending_resolved: {
        Args: {
          p_company_id: string
          p_pending_id: string
          p_reason?: string
          p_status: string
        }
        Returns: undefined
      }
      incentive_open_period: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_currency_code: string
          p_is_test_period?: boolean
          p_period_end: string
          p_period_label: string
          p_period_start: string
        }
        Returns: string
      }
      incentive_period_transition: {
        Args: {
          p_by_permission: string
          p_company_id: string
          p_new_state: string
          p_period_id: string
        }
        Returns: undefined
      }
      incentive_record_payment: {
        Args: {
          p_amount: number
          p_calculation_id: string
          p_company_id: string
          p_currency_code: string
          p_notes?: string
          p_payment_date: string
          p_payment_method: string
          p_reference?: string
          p_user_id: string
        }
        Returns: string
      }
      incentive_revoke_engineer_link: {
        Args: { p_company_id: string; p_link_id: string }
        Returns: undefined
      }
      incentive_update_plan: {
        Args: {
          p_calculation_basis?: string
          p_company_id: string
          p_description?: string
          p_effective_to?: string
          p_name?: string
          p_plan_id: string
          p_status?: string
        }
        Returns: undefined
      }
      incentive_void_calculation: {
        Args: {
          p_calculation_id: string
          p_company_id: string
          p_reason: string
        }
        Returns: undefined
      }
      is_super_admin: { Args: never; Returns: boolean }
      get_admin_companies_count: {
        Args: {
          p_search?: string | null
          p_status?: string | null
        }
        Returns: number
      }
      get_admin_users_count: {
        Args: {
          p_search?: string | null
        }
        Returns: number
      }
      get_platform_service_telemetry: { Args: Record<PropertyKey, never>; Returns: Json }
      get_platform_system_metrics: { Args: Record<PropertyKey, never>; Returns: Json }
      get_admin_companies_list: {
        Args: {
          p_search?: string | null
          p_status?: string | null
          p_limit?: number | null
          p_offset?: number | null
        }
        Returns: {
          id: string
          name_ar: string
          name_en: string | null
          tax_number: string | null
          base_currency: string
          owner_id: string | null
          owner_email: string | null
          phone: string | null
          is_active: boolean
          subscription_status: string
          trial_ends_at: string | null
          plan_id: string | null
          plan_name: string | null
          user_count: number
          branch_count: number
          invoice_count: number
          created_at: string
        }[]
      }
      toggle_company_status: {
        Args: {
          p_company_id: string
          p_is_active: boolean
          p_status: string
        }
        Returns: boolean
      }
      extend_company_trial: {
        Args: {
          p_company_id: string
          p_days: number
        }
        Returns: {
          trial_ends_at: string
          subscription_status: string
        }
      }
      admin_update_system_config: {
        Args: {
          p_key: string
          p_value: Json
        }
        Returns: boolean
      }
      admin_resolve_security_alert: {
        Args: {
          p_alert_id: number
          p_notes?: string | null
        }
        Returns: boolean
      }
      admin_assign_company_plan: {
        Args: {
          p_company_id: string
          p_plan_id?: string | null
        }
        Returns: boolean
      }
      get_admin_users_list: {
        Args: {
          p_search?: string | null
          p_limit?: number | null
          p_offset?: number | null
        }
        Returns: {
          user_id: string
          email: string
          created_at: string
          is_super_admin: boolean
          companies_count: number
          company_names: string[]
        }[]
      }
      toggle_super_admin: {
        Args: {
          p_target_user_id: string
          p_make_super_admin: boolean
        }
        Returns: boolean
      }
      is_valid_branch: {
        Args: { p_branch_id: string; p_company_id: string }
        Returns: boolean
      }
      log_cron_backup_event: { Args: never; Returns: undefined }
      normalize_arabic: { Args: { p_text: string }; Returns: string }
      normalize_oem_v1: { Args: { input_text: string }; Returns: string }
      post_manual_journal: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_currency_code?: string
          p_date: string
          p_description: string
          p_exchange_rate?: number
          p_lines: Json
          p_reference_type?: string
          p_user_id: string
        }
        Returns: string
      }
      process_sales_return: {
        Args: {
          p_company_id: string
          p_currency_code: string
          p_exchange_rate: number
          p_invoice_id: string
          p_issue_date: string
          p_items: Json
          p_notes: string
          p_party_id: string
          p_payment_method: string
          p_return_reason: string
          p_status: string
          p_user_id: string
        }
        Returns: Json
      }
      process_stock_transfer: {
        Args: { p_transfer_id: string }
        Returns: string
      }
      recalculate_all_party_balances: { Args: never; Returns: undefined }
      recalculate_party_balance: {
        Args: { p_party_id: string }
        Returns: number
      }
      recalculate_party_balance_from_ledger: {
        Args: { p_party_id: string }
        Returns: number
      }
      recalculate_product_stock: {
        Args: { p_product_id: string; p_warehouse_id?: string }
        Returns: undefined
      }
      recalculate_product_stock_for_warehouse: {
        Args: { p_product_id: string; p_warehouse_id: string }
        Returns: undefined
      }
      record_debt_reminder: {
        Args: {
          p_channel?: string
          p_company_id: string
          p_message_text: string
          p_party_id: string
          p_recipient?: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_template_id?: string
        }
        Returns: {
          activity_id: string
          message_log_id: string
        }[]
      }
      report_account_balances: {
        Args: {
          p_as_of_date?: string
          p_branch_id?: string
          p_company_id: string
        }
        Returns: {
          account_id: string
          balance: number
          total_credit: number
          total_debit: number
        }[]
      }
      report_balance_sheet: {
        Args: {
          p_as_of_date?: string
          p_branch_id?: string
          p_company_id: string
        }
        Returns: {
          amount: number
          category: string
          type: string
        }[]
      }
      report_cash_flow: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_from: string
          p_to: string
        }
        Returns: {
          category: string
          inflow: number
          outflow: number
        }[]
      }
      report_debt_aging: {
        Args: { p_company_id: string }
        Returns: {
          customer_name: string
          days_0_30: number
          days_31_60: number
          days_61_90: number
          days_90_plus: number
          total: number
        }[]
      }
      report_debts: { Args: { p_company_id: string }; Returns: Json }
      report_profit_loss: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_from: string
          p_to: string
        }
        Returns: {
          amount: number
          category: string
          type: string
        }[]
      }
      report_trial_balance: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_from: string
          p_to: string
        }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          account_type: string
          balance: number
          total_credit: number
          total_debit: number
        }[]
      }
      resolve_vehicle_from_vin: { Args: { p_vin: string }; Returns: Json }
      reverse_audit_session: { Args: { p_session_id: string }; Returns: Json }
      reverse_stock_transfer: { Args: { p_transfer_id: string }; Returns: Json }
      save_product_uoms: {
        Args: { p_product_id: string; p_uoms: Json }
        Returns: undefined
      }
      search_by_oem: {
        Args: { p_company_id: string; p_limit?: number; p_search_term: string }
        Returns: {
          brand: string
          match_quality: string
          product_id: string
          product_name: string
          product_name_ar: string
          product_sku: string
          sale_price: number
          source_number: string
          stock_quantity: number
          target_number: string
        }[]
      }
      search_cached_parts: {
        Args: { p_normalized_number: string; p_provider: string }
        Returns: {
          cached_at: string
          description: string
          display_number: string
          manufacturer: string
          manufacturer_id: number
          normalized_number: string
        }[]
      }
      search_cached_xrefs: {
        Args: { p_provider: string; p_source_number: string }
        Returns: {
          confidence: number
          evidence: string
          match_quality: string
          target_brand: string
          target_number: string
        }[]
      }
      search_inventory: {
        Args: { p_company_id: string; p_term: string }
        Returns: {
          alternative_numbers: string
          barcode: string
          brand: string
          category_name: string
          cost_price: number
          id: string
          image_url: string
          location: string
          name_ar: string
          part_number: string
          sale_price: number
          search_score: number
          size: string
          sku: string
          status: string
          stock_quantity: number
        }[]
      }
      search_inventory_paginated: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_limit: number
          p_offset: number
          p_sort_dir: string
          p_sort_key: string
          p_term: string
        }
        Returns: {
          alternative_numbers: string
          barcode: string
          brand: string
          category: Json
          category_id: string
          company_id: string
          created_at: string
          description: string
          id: string
          image_url: string
          min_stock_level: number
          name_ar: string
          part_number: string
          purchase_price: number
          sale_price: number
          size: string
          sku: string
          status: string
          stock: Json
          total_count: number
          unit: string
          updated_at: string
        }[]
      }
      search_parties: {
        Args: {
          p_company_id: string
          p_limit?: number
          p_query: string
          p_type?: string
        }
        Returns: {
          balance: number
          category_id: string
          category_name: string
          email: string
          id: string
          name: string
          phone: string
          status: string
          tax_number: string
          type: string
        }[]
      }
      soft_delete_account_guarded: {
        Args: {
          p_account_id: string
          p_company_id: string
        }
        Returns: Json
      }
      submit_vendor_quotation_revision: {
        Args: {
          p_company_id: string
          p_currency: string
          p_discount: number
          p_items: Json
          p_lead_time_days?: number
          p_notes?: string
          p_quotation_id: string
          p_subtotal: number
          p_tax: number
          p_terms?: string
          p_total: number
          p_validity_date?: string
          p_warranty_days?: number
        }
        Returns: Json
      }
      sync_product_search_numbers: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      test_active_accounts: { Args: { p_company_id: string }; Returns: Json }
      user_can_manage_debts:
        | { Args: never; Returns: boolean }
        | { Args: { p_company_id: string }; Returns: boolean }
      user_has_company_access: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      user_is_admin_or_manager:
        | { Args: never; Returns: boolean }
        | { Args: { p_company_id: string }; Returns: boolean }
      validate_data_integrity: {
        Args: { p_company_id: string }
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
      validate_journal_entry_balance: {
        Args: { p_journal_entry_id: string }
        Returns: boolean
      }
      verify_company_access: { Args: { p_company_id: string }; Returns: string }
      void_bond: { Args: { p_payment_id: string }; Returns: undefined }
      void_expense: { Args: { p_expense_id: string }; Returns: Json }
      quick_adjust_stock_batch: {
        Args: {
          p_company_id: string
          p_items: Json
          p_notes?: string
        }
        Returns: Json
      }
      void_invoice: { Args: { p_invoice_id: string }; Returns: Json }
    }
    Enums: {
      fin_account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
      fin_journal_status: "DRAFT" | "POSTED" | "REVERSED"
      inv_audit_status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      inv_movement_status: "DRAFT" | "POSTED" | "CANCELLED"
      inv_movement_type: "RECEIPT" | "ISSUE" | "TRANSFER" | "ADJUSTMENT"
      invoice_status_enum:
        | "draft"
        | "confirmed"
        | "paid"
        | "partially_paid"
        | "cancelled"
        | "void"
      party_type_enum: "customer" | "supplier" | "both"
      payment_status_enum: "draft" | "posted" | "void"
      product_status_enum: "active" | "inactive" | "discontinued"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fin_account_type: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
      fin_journal_status: ["DRAFT", "POSTED", "REVERSED"],
      inv_audit_status: ["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      inv_movement_status: ["DRAFT", "POSTED", "CANCELLED"],
      inv_movement_type: ["RECEIPT", "ISSUE", "TRANSFER", "ADJUSTMENT"],
      invoice_status_enum: [
        "draft",
        "confirmed",
        "paid",
        "partially_paid",
        "cancelled",
        "void",
      ],
      party_type_enum: ["customer", "supplier", "both"],
      payment_status_enum: ["draft", "posted", "void"],
      product_status_enum: ["active", "inactive", "discontinued"],
    },
  },
} as const