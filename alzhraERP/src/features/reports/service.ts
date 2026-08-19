import { logger } from '../../core/utils/logger';

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

// Helper to get current year date range
const getYearDateRange = () => {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-01-01`,
    to: now.toISOString().split('T')[0],
  };
};


export const reportsService = {
  getTrialBalance: async (companyId: string, fromDate?: string, toDate?: string): Promise<TrialBalanceItem[]> => {
    const { from, to } = (fromDate && toDate)
      ? { from: fromDate, to: toDate }
      : getYearDateRange();
    const { data, error } = await reportsApi.getTrialBalanceRPC(companyId, from, to);
    if (error) throw error;

    return (data || []).map((acc: { account_id: string; account_code: string; account_name: string; account_type: string; total_debit: number; total_credit: number; balance: number }) => ({
      id: acc.account_id,
      code: acc.account_code,
      name: acc.account_name,
      type: acc.account_type,
      totalDebit: Number(acc.total_debit) || 0,
      totalCredit: Number(acc.total_credit) || 0,
      netBalance: Number(acc.balance) || 0
    }));
  },

  /**
   * ⚡ Server-side P&L via RPC
   * RPC returns TABLE rows: {category, amount, type}
   */
  getProfitAndLoss: async (companyId: string, fromDate?: string, toDate?: string): Promise<{
    revenues: TrialBalanceItem[];
    expenses: TrialBalanceItem[];
    totalRevenues: number;
    totalExpenses: number;
    netProfit: number;
  }> => {
    const { from, to } = (fromDate && toDate)
      ? { from: fromDate, to: toDate }
      : getYearDateRange();

    const { data, error } = await supabase.rpc('report_profit_loss', {
      p_company_id: companyId,
      p_from: from,
      p_to: to
    });
    if (error) throw error;

    // RPC returns rows: [{category, amount, type}]
    const rows = (data || []) as { category: string; amount: number; type: string }[];
    const revenueRow = rows.find(r => r.type === 'revenue');
    const expenseRow = rows.find(r => r.type === 'expense');
    const netRow = rows.find(r => r.type === 'net_profit');

    const totalRevenues = Number(revenueRow?.amount) || 0;
    const totalExpenses = Number(expenseRow?.amount) || 0;
    const netProfit = Number(netRow?.amount) || (totalRevenues - totalExpenses);

    return {
      revenues: revenueRow ? [{
        id: 'revenue', code: '4', name: revenueRow.category, type: 'revenue',
        totalDebit: 0, totalCredit: 0, netBalance: totalRevenues
      }] : [],
      expenses: expenseRow ? [{
        id: 'expense', code: '5', name: expenseRow.category, type: 'expense',
        totalDebit: 0, totalCredit: 0, netBalance: totalExpenses
      }] : [],
      totalRevenues,
      totalExpenses,
      netProfit
    };
  },

  /**
   * ⚡ Server-side Balance Sheet via RPC
   * RPC returns TABLE rows: {category, amount, type}
   */
  getBalanceSheet: async (companyId: string): Promise<{
    assets: TrialBalanceItem[];
    liabilities: TrialBalanceItem[];
    equity: TrialBalanceItem[];
    totalAssets: number;
    totalLiabEquity: number;
  }> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('report_balance_sheet', {
      p_company_id: companyId,
      p_as_of_date: today
    });
    if (error) throw error;

    // RPC returns rows: [{category, amount, type}]
    const rows = (data || []) as { category: string; amount: number; type: string }[];
    const assetRow = rows.find(r => r.type === 'asset');
    const liabilityRow = rows.find(r => r.type === 'liability');
    const equityRow = rows.find(r => r.type === 'equity');

    const totalAssets = Number(assetRow?.amount) || 0;
    const totalLiabilities = Number(liabilityRow?.amount) || 0;
    const totalEquity = Number(equityRow?.amount) || 0;

    return {
      assets: assetRow ? [{
        id: 'asset', code: '1', name: assetRow.category, type: 'asset',
        totalDebit: 0, totalCredit: 0, netBalance: totalAssets
      }] : [],
      liabilities: liabilityRow ? [{
        id: 'liability', code: '2', name: liabilityRow.category, type: 'liability',
        totalDebit: 0, totalCredit: 0, netBalance: totalLiabilities
      }] : [],
      equity: equityRow ? [{
        id: 'equity', code: '3', name: equityRow.category, type: 'equity',
        totalDebit: 0, totalCredit: 0, netBalance: totalEquity
      }] : [],
      totalAssets,
      totalLiabEquity: totalLiabilities + totalEquity
    };
  },

  /**
   * ⚡ Server-side Debt Report via RPC
   * RPC returns TABLE rows: {customer_name, total, days_0_30, ...}
   */
  getDebtReport: async (companyId: string): Promise<ReportsStats> => {
    const { data, error } = await supabase.rpc('report_debt_aging', {
      p_company_id: companyId
    });
    if (error) throw error;

    const rows = (data || []) as { customer_name: string; total: number; days_0_30: number; days_31_60: number; days_61_90: number; days_90_plus: number }[];
    const totalDebt = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    // RPC report_debt_aging يعيد مديونيات العملاء فقط (total = إجمالي الاستحقاق).
    // الحقول غير المتوفرة من RPC تُملأ بقيم افتراضية آمنة.
    const debts: PartyDebt[] = rows.map(r => ({
      id: r.customer_name,
      name: r.customer_name,
      type: 'customer',
      currency: 'SAR',
      total_sales: Number(r.total) || 0,
      paid_amount: 0,
      remaining_amount: Number(r.total) || 0,
    }));

    return {
      summary: {
        receivables: totalDebt,
        payables: 0,
        currency: 'SAR',
      },
      debts
    };
  },

  // ⚡ Actual currency gain/loss using exchange_rates table
  getCurrencyDiffs: async (companyId: string): Promise<CurrencyAccount[]> => {
    const { data: company } = await supabase
      .from('companies')
      .select('base_currency')
      .eq('id', companyId)
      .single();
    const baseCurrency = company?.base_currency || 'SAR';

    const [{ data: accounts }, { data: balances }, { data: rates }] = await Promise.all([
      supabase.from('accounts')
        .select('id, name_ar, currency_code')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .not('currency_code', 'is', null)
        .neq('currency_code', baseCurrency),
      supabase.from('account_balances')
        .select('account_id, balance')
        .eq('company_id', companyId),
      supabase.from('exchange_rates')
        .select('currency_code, rate_to_base')
        .eq('company_id', companyId)
        .order('effective_date', { ascending: false })
    ]);

    const balanceMap = new Map((balances || []).map((b: any) => [b.account_id, Number(b.balance)]));
    const rateMap = new Map((rates || []).map((r: any) => [r.currency_code, Number(r.rate_to_base)]));

    return (accounts || []).map((a: any): CurrencyAccount => {
      const balance = Math.abs(balanceMap.get(a.id) || 0);
      const rate = rateMap.get(a.currency_code);
      // Calculate unrealized gain: balance converted at current rate vs base
      // If no exchange rate found, show 0 for gain
      const unrealizedGain = rate ? balance * rate - balance : 0;

      return {
        id: a.id,
        name: a.name_ar,
        currency_code: a.currency_code,
        balance,
        unrealizedGain: Math.round(unrealizedGain * 100) / 100
      };
    });
  },

  /**
   * ⚡ Cash Flow via RPC
   * RPC returns TABLE rows: {category, inflow, outflow}
   */
  getCashFlow: async (companyId: string): Promise<{
    currentLiquidity: number;
    monthlyTrend: MonthlyCashFlow[];
  }> => {
    const { from, to } = getYearDateRange();

    const [{ data: cashFlowData, error }, { data: liquidity, error: liqError }] = await Promise.all([
      supabase.rpc('report_cash_flow', {
        p_company_id: companyId,
        p_from: from,
        p_to: to
      }),
      supabase.rpc('get_cash_liquidity', { p_company_id: companyId })
    ]);

    if (error) logger.warn("service", '[reports] report_cash_flow error:', error?.message);
    if (liqError) logger.warn("service", '[reports] get_cash_liquidity error:', liqError?.message);

    // RPC returns rows: [{category, inflow, outflow}]
    const rows = (cashFlowData || []) as { category: string; inflow: number; outflow: number }[];
    const monthlyTrend: MonthlyCashFlow[] = rows.map(r => ({
      month: r.category,
      in: Math.max(0, Number(r.inflow) || 0),
      out: Math.max(0, Number(r.outflow) || 0),
      net: (Number(r.inflow) || 0) - (Number(r.outflow) || 0)
    }));

    return {
      currentLiquidity: Number(liquidity) || 0,
      monthlyTrend
    };
  },

  /**
   * ⚡ Fetch detailed transactions for a specific account (Drill-down)
   */
  getAccountTransactions: async (companyId: string, accountId: string, fromDate?: string, toDate?: string) => {
    let query = supabase.from('journal_entry_lines')
      .select(`
        id,
        debit_amount,
        credit_amount,
        journal_entries!inner(
          id,
          entry_date,
          description,
          reference_type,
          reference_id
        )
      `)
      .eq('account_id', accountId)
      .eq('journal_entries.company_id', companyId)
      .order('journal_entries(entry_date)', { ascending: false });

    if (fromDate) {
      query = query.gte('journal_entries.entry_date', fromDate);
    }
    if (toDate) {
      query = query.lte('journal_entries.entry_date', toDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((line: any) => ({
      id: line.id,
      date: line.journal_entries?.entry_date,
      description: line.journal_entries?.description,
      referenceType: line.journal_entries?.reference_type,
      referenceId: line.journal_entries?.reference_id,
      debit: Number(line.debit_amount) || 0,
      credit: Number(line.credit_amount) || 0,
      journalId: line.journal_entries?.id
    }));
  }
};
