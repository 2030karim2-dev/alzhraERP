
export type BondType = 'receipt' | 'payment' | 'transfer';

export interface BondFormData {
  type: BondType;
  amount: number;
  currency_code: string;
  exchange_rate: number;
  foreign_amount?: number;
  date: string;
  payment_method: string;

  // الطرف الذي يدخل أو يخرج منه المبلغ (الصندوق أو البنك)
  cash_account_id: string;

  // الطرف المقابل في القيد المحاسبي
  counterparty_type: 'party' | 'account';
  counterparty_id: string;

  description: string;
  reference_number?: string;
}

export interface Bond {
  id: string;
  payment_number: string;
  date: string;
  description: string;
  amount: number;
  currency_code: string;
  type: BondType;
  party_name?: string;
  account_name: string;
  status: 'posted' | 'draft' | 'void';
  exchange_rate?: number;
  base_amount?: number;
  payment_method?: string;
}
