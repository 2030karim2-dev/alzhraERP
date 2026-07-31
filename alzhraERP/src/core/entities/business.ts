
export interface Money {
  amount: number;
  currency: string;
  rate: number;
}

export interface BusinessTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  total: Money;
}

export type TransactionStatus = 'draft' | 'posted' | 'void' | 'paid';
