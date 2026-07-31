
export type ExpenseStatus = 'draft' | 'posted' | 'paid' | 'void';

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  is_system: boolean;
  color?: string;
  account_id?: string | null;
}

export interface Expense {
  id: string;
  category_id: string;
  category_name?: string;
  voucher_number?: string | null;
  description: string;
  amount: number;
  currency_code: string;
  exchange_rate: number;
  expense_date: string;
  status: ExpenseStatus;
  payment_method: 'cash' | 'bank' | 'credit';
  is_recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurring_end_date?: string;
  created_at?: string;
  branch_id?: string | null;
}

export interface ExpenseFormData {
  category_id: string;
  voucher_number?: string;
  description: string;
  amount: number;
  currency_code: string;
  exchange_rate: number;
  expense_date: string;
  status: ExpenseStatus;
  payment_method: 'cash' | 'bank' | 'credit';
  is_recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurring_end_date?: string;
  branch_id?: string | null;
}

export interface ExpenseCategorySummary {
  name: string;
  value: number;
  color: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  paidExpenses: number;
  pendingExpenses: number;
  categoriesCount: number;
}