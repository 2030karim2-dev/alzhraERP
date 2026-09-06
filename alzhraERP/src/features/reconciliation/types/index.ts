export interface EmployeeSalesSummary {
  user_id: string;
  employee_name: string;
  invoice_count: number;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
}

export type DenominationValue = 500 | 200 | 100 | 50 | 20 | 10 | 5 | 1 | 0.5;

export type CashDenominationCounts = Record<string, number>;

export interface ExistingReconciliationRecord {
  id: string;
  company_id: string;
  branch_id: string | null;
  reconciliation_date: string;
  shift_number: number;
  status: 'draft' | 'closed';
  opening_float: number;
  float_retained_for_tomorrow: number;
  cash_handed_to_owner: number;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  credit_sales?: number | undefined;
  returns_cash: number;
  returns_card: number;
  cash_receipts?: number | undefined;
  cash_disbursements?: number | undefined;
  petty_expenses_cash: number;
  expected_cash_in_drawer: number;
  actual_cash_counted: number;
  cash_denominations: CashDenominationCounts;
  card_terminal_receipt_total: number;
  cash_variance: number;
  card_variance: number;
  variance_reason: string | null;
  employee_breakdown: EmployeeSalesSummary[];
  notes: string | null;
  closed_by: string;
  closed_at: string;
  is_locked: boolean;
}

export interface DailyDrawerSummary {
  date: string;
  opening_float: number;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  credit_sales?: number | undefined;
  returns_cash: number;
  returns_card: number;
  cash_receipts?: number | undefined;
  cash_disbursements?: number | undefined;
  petty_expenses_cash: number;
  expected_cash_in_drawer: number;
  expected_card_terminal: number;
  employee_breakdown: EmployeeSalesSummary[];
  existing_reconciliation: ExistingReconciliationRecord | null;
  is_already_closed: boolean;
}

export interface CommitDailyReconciliationDTO {
  company_id: string;
  date: string;
  branch_id?: string | null | undefined;
  opening_float: number;
  actual_cash_counted: number;
  cash_denominations: CashDenominationCounts;
  card_terminal_receipt_total: number;
  float_retained_for_tomorrow: number;
  cash_handed_to_owner: number;
  variance_reason?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface QuickDrawerExpenseDTO {
  company_id: string;
  amount: number;
  description: string;
  branch_id?: string | null | undefined;
  expense_date?: string | null | undefined;
}
