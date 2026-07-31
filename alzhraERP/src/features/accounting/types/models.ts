
// import { LucideIcon } from 'lucide-react';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type JournalStatus = 'posted' | 'draft' | 'void';
export type AccountingView = 'overview' | 'journal' | 'ledger' | 'income' | 'balance_sheet' | 'accounts' | 'treasury';

export interface Account {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
  currency_code: string;
  is_system: boolean;
  parent_id?: string | null | undefined;
}

export interface JournalLine {
  id?: string | undefined;
  journal_entry_id?: string | undefined;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  account_name?: string | undefined; // Optional for UI display
}

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: number;
  entry_date: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  status: JournalStatus;
  created_at: string;
  created_by: string;
  created_by_profile?: { full_name: string }; // Populated manually
  party_name?: string; // Populated manually for invoices
  journal_entry_lines: JournalLine[];
}

export interface UIJournalLine {
  description?: string;
  debit_amount?: number;
  credit_amount?: number;
  account?: {
    name?: string;
    name_ar?: string;
    code?: string;
  };
}

export interface UIJournalEntry extends Omit<JournalEntry, 'journal_entry_lines'> {
  journal_entry_lines: UIJournalLine[];
  total_amount?: number;
}

export interface JournalEntryFormData {
  date: string;
  description: string;
  reference_type?: string | undefined;
  profile_name?: string | undefined;
  party_name?: string | undefined;
  currency_code?: string | undefined;
  exchange_rate?: number | undefined;
  lines: Omit<JournalLine, 'id' | 'journal_entry_id'>[];
}

export interface AccountFormData {
  code: string;
  name: string;
  type: AccountType;
  parent_id?: string | undefined;
}