
/**
 * Accounting module type definitions
 * Used by journal entries, ledger views, account management, and financial reports.
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountNature = 'debit' | 'credit';
export type JournalEntryStatus = 'draft' | 'posted' | 'void';
export type ReferenceType = 'manual' | 'sale' | 'purchase' | 'expense' | 'bond' | 'adjustment';

export interface Account {
    id: string;
    company_id: string;
    code: string;
    name_ar: string;
    name_en?: string | null | undefined;
    type: AccountType;
    parent_id?: string | null | undefined;
    is_system: boolean;
    is_active: boolean;
    balance?: number | undefined;
    currency_code?: string;
    level?: number | undefined; // Computed in tree building
    created_at: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface JournalEntryLine {
    id?: string;
    journal_entry_id?: string;
    account_id: string;
    debit_amount: number;
    credit_amount: number;
    description?: string;
    account?: {
        name_ar: string;
        code: string;
    };
}

export interface JournalEntry {
    id: string;
    company_id: string;
    entry_number?: number;
    entry_date: string;
    description: string;
    status: JournalEntryStatus;
    reference_type: ReferenceType;
    reference_id?: string | null;
    currency_code?: string;
    created_by: string;
    created_at: string;
    journal_entry_lines: JournalEntryLine[];
}

export interface CreateJournalEntryDTO {
    date: string;
    description: string;
    reference_type?: ReferenceType | undefined;
    reference_id?: string | undefined;
    lines: {
        account_id: string;
        debit: number;
        credit: number;
        description?: string | undefined;
    }[];
}

export interface AccountTreeNode extends Account {
    children: AccountTreeNode[];
}

export interface TrialBalanceRow {
    account_code: string;
    account_name: string;
    account_type: AccountType;
    debit_total: number;
    credit_total: number;
    balance: number;
}
