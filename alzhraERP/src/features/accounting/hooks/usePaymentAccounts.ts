import { useMemo } from 'react';
import { useCashboxes, useExchangeCompanies } from './useTreasury';

// ─── Payment Account type used throughout POS & payments ─────────────────────
export interface PaymentAccount {
  id: string;
  cashbox_id?: string;
  exchange_company_id?: string;
  name_ar: string;
  code: string;
  currency_code: string;
  balance: number;
}

// ─── Cash / Cashbox accounts ──────────────────────────────────────────────────

export const useCashPaymentAccounts = () => {
  const { data: cashboxes, isLoading } = useCashboxes();
  const accounts = useMemo<PaymentAccount[]>(() =>
    (cashboxes ?? []).map(cb => ({
      id: cb.account_id ?? cb.id,   // account_id for journal entries
      cashbox_id: cb.id,
      name_ar: cb.name,
      code: '',
      currency_code: cb.currency_code,
      balance: Number(cb.opening_balance) || 0,
    })), [cashboxes]);
  return { data: accounts, isLoading };
};

// ─── Exchange company accounts ────────────────────────────────────────────────

export const useExchangePaymentAccounts = () => {
  const { data: companies, isLoading } = useExchangeCompanies();
  const accounts = useMemo<PaymentAccount[]>(() =>
    (companies ?? []).map(ec => ({
      id: ec.account_id ?? ec.id,
      exchange_company_id: ec.id,
      name_ar: ec.name,
      code: '',
      currency_code: ec.currency_code,
      balance: Number(ec.opening_balance) || 0,
    })), [companies]);
  return { data: accounts, isLoading };
};

// ─── Legacy combined hook (kept for backwards compatibility) ──────────────────

export const usePaymentAccounts = () => {
  const { data: cash, isLoading: l1 } = useCashPaymentAccounts();
  const { data: exchanges, isLoading: l2 } = useExchangePaymentAccounts();
  const data = useMemo(() => [...(cash ?? []), ...(exchanges ?? [])], [cash, exchanges]);
  return { data, isLoading: l1 || l2 };
};
