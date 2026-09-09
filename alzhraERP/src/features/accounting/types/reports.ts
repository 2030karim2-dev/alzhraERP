export interface LedgerEntry {
  date: string;
  journal_entry_id: string;
  entry_number: number;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance: number; // Running balance (sign-normalised by the RPC per account nature)
  accountType?: string; // 'asset'|'expense' → debit-normal; 'liability'|'equity'|'revenue' → credit-normal
  branch_id?: string | null;
  currency_code?: string;
  exchange_rate?: number;
  foreign_amount?: number;
  party_id?: string;
  party_name?: string;
  reference_type?: string;
  reference_id?: string;
}

export interface TrialBalanceItem {
  account_id: string;
  code: string;
  name: string;
  type: string;
  total_debit: number;
  total_credit: number;
  /**
   * اتفاقية الإشارات (SIGN CONVENTION — لا يُغيَّر هذا):
   *   revenue: net_balance = credit - debit  (موجب = إيراد طبيعي)
   *   expense: net_balance = debit - credit  (موجب = مصروف طبيعي)
   *   قيمة سالبة = قيد عكسي → تُطرح من الإجمالي لا تُجمع إليه
   *
   * ⚠️ يُمنع استخدام Math.abs() على net_balance في أي مكون واجهة
   *    لأنه يحوّل القيود العكسية إلى مبالغ مضافة ويضاعف الأرقام.
   *    استخدم الإشارة للتلوين فقط: negative → عرض باللون الأخضر (استرداد).
   */
  net_balance: number;
  currency_code: string;
  /** علامة COGS من report_profit_loss_detailed — الكود 5100 أو يبدأ بـ 51 */
  is_cogs?: boolean;
}

export interface FinancialReportItem {
  category: string; // e.g., "Current Assets", "Operating Expenses"
  accounts: Array<{ name: string; balance: number }>;
  total: number;
}
