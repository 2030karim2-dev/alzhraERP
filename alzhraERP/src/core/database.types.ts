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
      accounts: {
        Row: {
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
        }
        Insert: {
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
        }
        Update: {
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
          counted_quantity: number | null
          expected_quantity: number
          id: string
          notes: string | null
          product_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          counted_quantity?: number | null
          expected_quantity?: number
          id?: string
          notes?: string | null
          product_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          counted_quantity?: number | null
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
            foreignKeyName: "audit_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "audit_sessions"
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
      audit_sessions: {
        Row: {
          company_id: string
          completed_at: string | null
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
          tax_number: string | null
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
          tax_number?: string | null
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
          tax_number?: string | null
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
        }
        Insert: {
          assigned_at?: string | null
          customer_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string | null
          customer_id?: string
          tag_id?: string
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
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
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
          voucher_number: string | null
        }
        Insert: {
          amount?: number
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
          voucher_number?: string | null
        }
        Update: {
          amount?: number
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
          transaction_type: string
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
          transaction_type: string
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
          transaction_type?: string
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
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          discount_amount: number
          due_date: string | null
          exchange_rate: number
          id: string
          invoice_number: string | null
          issue_date: string
          notes: string | null
          paid_amount: number
          party_id: string | null
          payment_method: string | null
          reference_invoice_id: string | null
          return_reason: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          discount_amount?: number
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          party_id?: string | null
          payment_method?: string | null
          reference_invoice_id?: string | null
          return_reason?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          discount_amount?: number
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          party_id?: string | null
          payment_method?: string | null
          reference_invoice_id?: string | null
          return_reason?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
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
      journal_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          entry_date: string
          entry_number: number
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_date?: string
          entry_number: number
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: number
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
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
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          company_id: string
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
          company_id: string
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
          company_id?: string
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
          notify_on_bond: boolean
          notify_on_expense: boolean
          notify_on_low_stock: boolean
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
          notify_on_bond?: boolean
          notify_on_expense?: boolean
          notify_on_low_stock?: boolean
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
          notify_on_bond?: boolean
          notify_on_expense?: boolean
          notify_on_low_stock?: boolean
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
          payment_terms: number | null
          payment_terms_days: number | null
          phone: string | null
          preferred_contact_method: string | null
          satisfaction_score: number | null
          status: string
          supplier_type: string | null
          tax_number: string | null
          total_invoices_count: number | null
          total_orders_count: number | null
          total_paid_amount: number | null
          total_purchases_amount: number | null
          type: string
          updated_at: string | null
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
          payment_terms?: number | null
          payment_terms_days?: number | null
          phone?: string | null
          preferred_contact_method?: string | null
          satisfaction_score?: number | null
          status?: string
          supplier_type?: string | null
          tax_number?: string | null
          total_invoices_count?: number | null
          total_orders_count?: number | null
          total_paid_amount?: number | null
          total_purchases_amount?: number | null
          type: string
          updated_at?: string | null
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
          payment_terms?: number | null
          payment_terms_days?: number | null
          phone?: string | null
          preferred_contact_method?: string | null
          satisfaction_score?: number | null
          status?: string
          supplier_type?: string | null
          tax_number?: string | null
          total_invoices_count?: number | null
          total_orders_count?: number | null
          total_paid_amount?: number | null
          total_purchases_amount?: number | null
          type?: string
          updated_at?: string | null
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
      payment_allocations: {
        Row: {
          amount: number
          id: string
          invoice_id: string
          payment_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          id?: string
          invoice_id: string
          payment_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string
          payment_id?: string
          updated_at?: string
        }
        Relationships: [
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
          company_id: string
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
        }
        Insert: {
          account_id?: string | null
          amount: number
          company_id: string
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
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string
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
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
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
          component_product_id: string
          created_at: string
          id: string
          kit_product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          component_product_id: string
          created_at?: string
          id?: string
          kit_product_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          component_product_id?: string
          created_at?: string
          id?: string
          kit_product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
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
        ]
      }
      product_stock: {
        Row: {
          company_id: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
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
          has_core_charge: boolean | null
          id: string
          image_url: string | null
          is_kit: boolean | null
          min_stock_level: number
          name_ar: string
          part_number: string | null
          purchase_price: number
          sale_price: number
          size: string | null
          sku: string
          specifications: string | null
          status: string
          unit: string
          updated_at: string
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
          has_core_charge?: boolean | null
          id?: string
          image_url?: string | null
          is_kit?: boolean | null
          min_stock_level?: number
          name_ar: string
          part_number?: string | null
          purchase_price?: number
          sale_price?: number
          size?: string | null
          sku: string
          specifications?: string | null
          status?: string
          unit?: string
          updated_at?: string
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
          has_core_charge?: boolean | null
          id?: string
          image_url?: string | null
          is_kit?: boolean | null
          min_stock_level?: number
          name_ar?: string
          part_number?: string | null
          purchase_price?: number
          sale_price?: number
          size?: string | null
          sku?: string
          specifications?: string | null
          status?: string
          unit?: string
          updated_at?: string
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
      stock_transfer_items: {
        Row: {
          id: string
          product_id: string
          quantity: number
          transfer_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          transfer_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          transfer_id?: string
          updated_at?: string
        }
        Relationships: [
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
          company_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          balance: number | null
          code: string | null
          company_id: string | null
          created_at: string | null
          currency_code: string | null
          deleted_at: string | null
          id: string | null
          is_active: boolean | null
          is_system: boolean | null
          name_ar: string | null
          name_en: string | null
          parent_id: string | null
          type: string | null
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
        }
        Relationships: [
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
        ]
      }
      active_parties: {
        Row: {
          address: string | null
          balance: number | null
          category_id: string | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string | null
          name: string | null
          phone: string | null
          status: string | null
          tax_number: string | null
          type: string | null
          updated_at: string | null
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
      party_balances: {
        Row: {
          balance: number | null
          company_id: string | null
          party_id: string | null
          type: string | null
        }
        Insert: {
          balance?: never
          company_id?: string | null
          party_id?: string | null
          type?: string | null
        }
        Update: {
          balance?: never
          company_id?: string | null
          party_id?: string | null
          type?: string | null
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
    }
    Functions: {
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
      commit_expense: {
        Args: {
          p_amount: number
          p_category_id: string
          p_company_id: string
          p_currency?: string
          p_date?: string
          p_description?: string
          p_exchange_rate?: number
          p_payment_method?: string
          p_user_id: string
          p_voucher_number?: string
        }
        Returns: string
      }
      commit_expense_v2: {
        Args: {
          p_amount?: number
          p_cash_account_id?: string
          p_category_id: string
          p_company_id: string
          p_currency?: string
          p_date?: string
          p_description?: string
          p_exchange_rate?: number
          p_payment_method?: string
          p_user_id: string
          p_voucher_number?: string
        }
        Returns: Json
      }
      commit_payment: {
        Args: {
          p_amount: number
          p_cash_account_id?: string
          p_company_id: string
          p_counterparty_id?: string
          p_counterparty_type?: string
          p_currency_code?: string
          p_date?: string
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
          p_company_id: string
          p_currency?: string
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
          p_company_id: string
          p_currency: string
          p_exchange_rate: number
          p_items: Json
          p_notes: string
          p_supplier_id: string
          p_user_id: string
        }
        Returns: Json
      }
      commit_sale_return: {
        Args: {
          p_company_id: string
          p_currency?: string
          p_exchange_rate?: number
          p_items: Json
          p_notes?: string
          p_party_id: string
          p_reference_invoice_id?: string
          p_return_reason?: string
          p_user_id: string
          p_branch_id?: string | null
        }
        Returns: Json
      }
      commit_sales_invoice: {
        Args: {
          p_company_id: string
          p_currency?: string
          p_discount_amount?: number
          p_exchange_rate?: number
          p_issue_date?: string
          p_items: Json
          p_notes?: string
          p_party_id: string
          p_payment_method?: string
          p_treasury_account_id?: string
          p_user_id: string
          p_branch_id?: string | null
        }
        Returns: Json
      }
      create_financial_bond: {
        Args: {
          p_amount: number
          p_bond_type: string
          p_cash_account_id: string
          p_company_id: string
          p_counterparty_id: string
          p_counterparty_type: string
          p_currency_code?: string
          p_date?: string
          p_description: string
          p_exchange_rate?: number
          p_foreign_amount?: number
          p_invoice_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      finalize_audit_session: {
        Args: { p_items: Json; p_session_id: string; p_user_id: string }
        Returns: undefined
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
          p_company_id: string
          p_from?: string
          p_to?: string
        }
        Returns: Json
      }
      get_auth_companies: { Args: never; Returns: string[] }
      get_auth_company_id: { Args: never; Returns: string }
      get_auth_user_companies: { Args: never; Returns: string[] }
      get_bonds_stats: { Args: { p_company_id: string }; Returns: Json }
      get_cash_liquidity: { Args: { p_company_id: string }; Returns: number }
      get_customer_stats: { Args: { p_company_id: string }; Returns: Json }
      get_dashboard_totals: { Args: { p_company_id: string }; Returns: Json }
      get_dead_stock: {
        Args: { days_threshold?: number; p_limit?: number; p_offset?: number }
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
      get_expense_stats: { Args: { p_company_id: string }; Returns: Json }
      get_inventory_valuation: { Args: { p_company_id: string }; Returns: Json }
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
        Args: { p_company_id?: string }
        Returns: {
          category_name: string
          cost_price: number
          id: string
          min_stock_level: number
          name_ar: string
          part_number: string
          sale_price: number
          sku: string
          total_stock: number
        }[]
      }
      get_next_invoice_number: {
        Args: { p_company_id: string; p_prefix?: string }
        Returns: string
      }
      get_next_journal_entry_number: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_next_sequence: {
        Args: { p_company_id: string; p_type: string }
        Returns: string
      }
      get_party_statement: {
        Args: { p_company_id: string; p_party_id: string }
        Returns: Json
      }
      get_potential_duplicates: {
        Args: { p_company_id: string }
        Returns: {
          product_a_brand: string
          product_a_id: string
          product_a_name: string
          product_a_price: number
          product_a_sku: string
          product_a_stock: number
          product_b_brand: string
          product_b_id: string
          product_b_name: string
          product_b_price: number
          product_b_sku: string
          product_b_stock: number
          similarity: number
        }[]
      }
      get_product_analytics: {
        Args: { p_product_id: string }
        Returns: {
          average_monthly_sales: number
          last_sale_date: string
          total_profit: number
          total_purchases_qty: number
          total_sales_qty: number
        }[]
      }
      get_product_fitment: {
        Args: { p_id: string }
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
      get_purchase_stats: { Args: { p_company_id: string }; Returns: Json }
      get_sales_analytics: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
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
      get_user_profile: { Args: { p_user_id: string }; Returns: Json }
      get_vehicle_products: {
        Args: { v_id: string }
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
        Args: { p_company_id: string, p_branch_id?: string | null }
        Returns: {
          id: string
          location: string
          name_ar: string
          total_products: number
          total_quantity: number
          total_value: number
        }[]
      }
      log_cron_backup_event: { Args: never; Returns: undefined }
      post_manual_journal: {
        Args: {
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
        Args: {
          p_company_id: string
          p_from_warehouse: string
          p_items: Json
          p_notes?: string
          p_to_warehouse: string
          p_user_id: string
        }
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
      report_balance_sheet: {
        Args: { p_company_id: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      report_cash_flow: {
        Args: { p_company_id: string; p_from?: string; p_to?: string }
        Returns: {
          inflow: number
          month: string
          net: number
          outflow: number
        }[]
      }
      report_debt_aging: { Args: { p_company_id: string }; Returns: Json }
      report_profit_loss: {
        Args: { p_company_id: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      report_trial_balance: {
        Args: { p_company_id: string; p_from: string; p_to: string }
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
      search_inventory: {
        Args: { p_company_id: string; p_term: string }
        Returns: {
          brand: string
          cost_price: number
          id: string
          name_ar: string
          part_number: string
          sale_price: number
          sku: string
          stock_quantity: number
        }[]
      }
      user_has_company_access: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      validate_journal_entry_balance: {
        Args: { p_journal_entry_id: string }
        Returns: boolean
      }
      void_bond: { Args: { p_payment_id: string }; Returns: undefined }
      void_expense: { Args: { p_expense_id: string }; Returns: undefined }
      void_invoice: { Args: { p_invoice_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
