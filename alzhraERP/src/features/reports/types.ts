export type ReportTab = 'trial_balance' | 'debt_report' | 'currency_diff' | 'p_and_l' | 'balance_sheet' | 'cash_flow' | 'item_movement' | 'returns_report' | 'daily_sales' | 'operational_expenses' | 'debt_aging';

export interface DebtSummary {
  receivables: number;
  payables: number;
  currency: string;
}

export interface PartyDebt {
  id: string;
  name: string;
  type: 'customer' | 'supplier';
  currency: string;
  total_sales: number;
  paid_amount: number;
  remaining_amount: number;
}

export interface ReportsStats {
  summary: DebtSummary;
  debts: PartyDebt[];
}