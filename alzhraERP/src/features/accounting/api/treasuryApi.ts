import { supabase } from '../../../lib/supabaseClient';
import { parseError } from '../../../core/utils/errorUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Cashbox {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  account_id: string | null;
  currency_code: string;
  is_active: boolean;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

export interface ExchangeCompany {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  account_id: string | null;
  currency_code: string;
  is_active: boolean;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTreasuryInput {
  name: string;
  currency_code: string;
  branch_id?: string;
  opening_balance?: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const treasuryApi = {
  // ── Cashboxes ──────────────────────────────────────────────────────────────

  getCashboxes: async (companyId: string) => {
    return await supabase
      .from('cashboxes')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
  },

  createCashbox: async (companyId: string, input: CreateTreasuryInput) => {
    const { data, error } = await supabase.rpc('create_cashbox', {
      p_company_id: companyId,
      p_name: input.name,
      p_currency_code: input.currency_code,
      ...(input.branch_id ? { p_branch_id: input.branch_id } : {}),
      p_opening_balance: input.opening_balance ?? 0,
    });
    if (error) throw error;
    return data as { cashbox_id: string; account_id: string; account_code: string };
  },

  /**
   * Deactivate a cashbox (soft-off). Defense-in-depth: explicit company_id
   * filter on top of RLS, and returns the updated row id so callers can detect
   * "not found / not owned by this company" (null) instead of a silent no-op.
   */
  deactivateCashbox: async (companyId: string, id: string) => {
    const { data, error } = await supabase
      .from('cashboxes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id')
      .maybeSingle();
    if (error) throw parseError(error);
    return data;
  },

  // ── Exchange Companies ─────────────────────────────────────────────────────

  getExchangeCompanies: async (companyId: string) => {
    return await supabase
      .from('exchange_companies')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
  },

  createExchangeCompany: async (companyId: string, input: CreateTreasuryInput) => {
    const { data, error } = await supabase.rpc('create_exchange_company', {
      p_company_id: companyId,
      p_name: input.name,
      p_currency_code: input.currency_code,
      ...(input.branch_id ? { p_branch_id: input.branch_id } : {}),
      p_opening_balance: input.opening_balance ?? 0,
    });
    if (error) throw error;
    return data as { exchange_company_id: string; account_id: string; account_code: string };
  },

  /**
   * Deactivate an exchange company (soft-off). Defense-in-depth mirrors
   * `deactivateCashbox`: explicit company_id filter + ownership-aware result.
   */
  deactivateExchangeCompany: async (companyId: string, id: string) => {
    const { data, error } = await supabase
      .from('exchange_companies')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id')
      .maybeSingle();
    if (error) throw parseError(error);
    return data;
  },
};
