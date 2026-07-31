
import { reportsApi } from './api';
import { PartyDebt, ReportsStats } from './types';
import { supabase } from '../../lib/supabaseClient';


// Type definitions for report data

interface TrialBalanceItem {
  id: string;
  code: string;
  name: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}

interface CurrencyAccount {
  id: string;
  name: string;
  currency_code: string;
  balance: number;
  unrealizedGain: number;
}

interface MonthlyCashFlow {
  month: string;
  in: number;
  out: number;
  net: number;
}


export const reportsService = {
  getTrialBalance: async (companyId: string): Promise<TrialBalanceItem[]> => {
    // Use server-side RPC which correctly handles account types
    const now = new Date();
    const fromDate = `${now.getFullYear()}-01-01`;
    const toDate = now.toISOString().split('T')[0];

    const { data, error } = await reportsApi.getTrialBalanceRPC(companyId, fromDate, toDate);
    if (error) throw error;

    return (data || []).map((acc: { account_id: string; account_code: string; account_name: string; account_type: string; total_debit: number; total_credit: number; balance: number }) => ({
      id: acc.account_id,
      code: acc.account_code,
      name: acc.account_name,
      type: acc.account_type,
      totalDebit: Number(acc.total_debit) || 0,
      totalCredit: Number(acc.total_credit) || 0,
      // Server-side already computes balance based on account type
      netBalance: Number(acc.balance) || 0
    }));
  },

  /**
   * ⚡ Server-side P&L via RPC — no frontend aggregation
   */
  getProfitAndLoss: async (companyId: string): Promise<{
    revenues: TrialBalanceItem[];
    expenses: TrialBalanceItem[];
    totalRevenues: number;
    totalExpenses: number;
    netProfit: number;
  }> => {
    const { data, error } = await supabase.rpc('report_profit_loss', {
      p_company_id: companyId
    });
    if (error) throw error;

    const result = data as {
      revenues: { id: string; code: string; name: string; netBalance: number }[],
      expenses: { id: string; code: string; name: string; netBalance: number }[],
      totalRevenues: number,
      totalExpenses: number,
      netProfit: number
    };
    return {
      revenues: (result.revenues || []).map((r) => ({
        id: r.id, code: r.code, name: r.name, type: 'revenue',
        totalDebit: 0, totalCredit: 0, netBalance: r.netBalance
      })),
      expenses: (result.expenses || []).map((e) => ({
        id: e.id, code: e.code, name: e.name, type: 'expense',
        totalDebit: 0, totalCredit: 0, netBalance: e.netBalance
      })),
      totalRevenues: result.totalRevenues || 0,
      totalExpenses: result.totalExpenses || 0,
      netProfit: result.netProfit || 0
    };
  },

  /**
   * ⚡ Server-side Balance Sheet via RPC — no frontend aggregation
   */
  getBalanceSheet: async (companyId: string): Promise<{
    assets: TrialBalanceItem[];
    liabilities: TrialBalanceItem[];
    equity: TrialBalanceItem[];
    totalAssets: number;
    totalLiabEquity: number;
  }> => {
    const { data, error } = await supabase.rpc('report_balance_sheet', {
      p_company_id: companyId
    });
    if (error) throw error;

    const result = data as any;
    const mapItems = (items: any[], type: string) => (items || []).map((a: any) => ({
      id: a.id, code: a.code, name: a.name, type,
      totalDebit: 0, totalCredit: 0, netBalance: a.netBalance
    }));

    return {
      assets: mapItems(result.assets, 'asset'),
      liabilities: mapItems(result.liabilities, 'liability'),
      equity: mapItems(result.equity, 'equity'),
      totalAssets: result.totalAssets || 0,
      totalLiabEquity: result.totalLiabEquity || 0
    };
  },

  /**
   * ⚡ Server-side Debt Report via RPC — no frontend aggregation
   */
  getDebtReport: async (companyId: string): Promise<ReportsStats> => {
    const { data, error } = await supabase.rpc('report_debt_aging', {
      p_company_id: companyId
    });
    if (error) throw error;

    const result = data as any;
    return {
      summary: result.summary,
      debts: (result.debts || []) as PartyDebt[]
    };
  },

  // ⚡ Fix: Removed Math.random() — unrealized gain is now set to 0 until proper exchange rate revaluation is implemented
  getCurrencyDiffs: async (companyId: string): Promise<CurrencyAccount[]> => {
    // 1. Fetch company base currency
    const { data: company } = await supabase
      .from('companies')
      .select('base_currency')
      .eq('id', companyId)
      .single();
    const baseCurrency = company?.base_currency || 'SAR';

    // 2. Fetch all foreign currency accounts with their balances
    const { data: accounts } = await supabase.from('active_accounts')
      .select('id, name_ar, currency_code, balance')
      .eq('company_id', companyId)
      .not('currency_code', 'is', null)
      .neq('currency_code', baseCurrency);

    // 3. Map into the format expected by CurrencyDiffView
    // ⚡ unrealizedGain is now 0 — will be calculated from real exchange rates when implemented
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (accounts || []).map((a: any): CurrencyAccount => ({
      id: a.id,
      name: a.name_ar,
      currency_code: a.currency_code,
      balance: Math.abs(a.balance || 0),
      unrealizedGain: 0 // ⚡ Previously Math.random() — now 0 until revaluation is implemented
    }));
  },

  // ⚡ Optimized: Uses server-side RPCs instead of fetching all journal lines
  getCashFlow: async (companyId: string): Promise<{
    currentLiquidity: number;
    monthlyTrend: MonthlyCashFlow[];
  }> => {
    // 1. Get monthly cash flow from RPC (server-side aggregation)
    const { data: monthlyData, error } = await supabase.rpc('report_cash_flow', {
      p_company_id: companyId
    });
    if (error) throw error;

    // 2. Get current liquidity from RPC
    const { data: liquidity, error: liqError } = await supabase.rpc('get_cash_liquidity', {
      p_company_id: companyId
    });
    if (liqError) throw liqError;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthlyTrend = ((monthlyData || []) as Array<{ month: string, inflow: number, outflow: number, net: number }>).map(d => ({
      month: d.month,
      in: Math.max(0, Number(d.inflow) || 0),
      out: Math.max(0, Number(d.outflow) || 0),
      net: Number(d.net) || 0
    }));

    return {
      currentLiquidity: Number(liquidity) || 0,
      monthlyTrend
    };
  },

  /**
   * ⚡ Fetch detailed transactions for a specific account (Drill-down capability)
   */
  getAccountTransactions: async (companyId: string, accountId: string, fromDate?: string, toDate?: string) => {
    let query = supabase.from('journal_lines')
      .select(`
        id,
        debit,
        credit,
        journal_entries!inner(
          id,
          date,
          description,
          reference_type,
          reference_id
        )
      `)
      .eq('account_id', accountId)
      .eq('journal_entries.company_id', companyId)
      .order('journal_entries(date)', { ascending: false });

    if (fromDate) {
      query = query.gte('journal_entries.date', fromDate);
    }
    if (toDate) {
      query = query.lte('journal_entries.date', toDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map((line: any) => ({
      id: line.id,
      date: line.journal_entries?.date,
      description: line.journal_entries?.description,
      referenceType: line.journal_entries?.reference_type,
      referenceId: line.journal_entries?.reference_id,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
      journalId: line.journal_entries?.id
    }));
  }
};
