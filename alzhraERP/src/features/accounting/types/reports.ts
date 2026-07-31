
export interface LedgerEntry {
  date: string;
  journal_entry_id: string;
  entry_number: number;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance: number; // Running balance
  currency_code?: string;
  exchange_rate?: number;
  foreign_amount?: number;
}

export interface TrialBalanceItem {
  account_id: string;
  code: string;
  name: string;
  type: string;
  total_debit: number;
  total_credit: number;
  net_balance: number;
  currency_code: string;
}

export interface FinancialReportItem {
  category: string; // e.g., "Current Assets", "Operating Expenses"
  accounts: { name: string; balance: number }[];
  total: number;
}