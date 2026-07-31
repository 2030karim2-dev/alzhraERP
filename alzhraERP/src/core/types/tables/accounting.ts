// ============================================
// Accounting Tables
// Tables: accounts, journal_entries, journal_entry_lines
// Views: account_balances, active_accounts
// ============================================

export type AccountRow = {
  code: string;
  company_id: string;
  created_at: string;
  currency_code: string;
  deleted_at: string | null;
  id: string;
  is_active: boolean;
  is_system: boolean;
  name_ar: string;
  name_en: string | null;
  parent_id: string | null;
  type: string;
  updated_at: string | null;
};

export type AccountInsert = {
  code: string;
  company_id: string;
  created_at?: string;
  currency_code?: string;
  deleted_at?: string | null;
  id?: string;
  is_active?: boolean;
  is_system?: boolean;
  name_ar: string;
  name_en?: string | null;
  parent_id?: string | null;
  type: string;
  updated_at?: string | null;
};

export type AccountUpdate = {
  code?: string;
  company_id?: string;
  created_at?: string;
  currency_code?: string;
  deleted_at?: string | null;
  id?: string;
  is_active?: boolean;
  is_system?: boolean;
  name_ar?: string;
  name_en?: string | null;
  parent_id?: string | null;
  type?: string;
  updated_at?: string | null;
};

export type JournalEntryRow = {
  company_id: string;
  created_at: string;
  created_by: string;
  date: string;
  description: string | null;
  fiscal_year_id: string | null;
  id: string;
  is_auto_generated: boolean;
  is_template: boolean;
  status: string;
  updated_at: string | null;
};

export type JournalEntryInsert = {
  company_id: string;
  created_at?: string;
  created_by?: string;
  date: string;
  description?: string | null;
  fiscal_year_id?: string | null;
  id?: string;
  is_auto_generated?: boolean;
  is_template?: boolean;
  status?: string;
  updated_at?: string | null;
};

export type JournalEntryUpdate = {
  company_id?: string;
  created_at?: string;
  created_by?: string;
  date?: string;
  description?: string | null;
  fiscal_year_id?: string | null;
  id?: string;
  is_auto_generated?: boolean;
  is_template?: boolean;
  status?: string;
  updated_at?: string | null;
};

export type JournalEntryLineRow = {
  account_id: string;
  company_id: string;
  created_at: string;
  credit: number;
  debit: number;
  description: string | null;
  entry_id: string;
  id: string;
  updated_at: string | null;
};

export type JournalEntryLineInsert = {
  account_id: string;
  company_id: string;
  created_at?: string;
  credit?: number;
  debit?: number;
  description?: string | null;
  entry_id: string;
  id?: string;
  updated_at?: string | null;
};

export type JournalEntryLineUpdate = {
  account_id?: string;
  company_id?: string;
  created_at?: string;
  credit?: number;
  debit?: number;
  description?: string | null;
  entry_id?: string;
  id?: string;
  updated_at?: string | null;
};

export type AccountBalanceView = {
  account_code: string;
  account_id: string;
  account_name: string;
  account_type: string;
  balance: number;
  company_id: string;
  credit_total: number;
  debit_total: number;
};

export type ActiveAccountView = {
  code: string;
  company_id: string;
  created_at: string;
  currency_code: string;
  id: string;
  is_active: boolean;
  is_system: boolean;
  name_ar: string;
  name_en: string | null;
  parent_id: string | null;
  type: string;
  updated_at: string | null;
};
