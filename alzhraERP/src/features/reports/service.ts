import { logger } from '../../core/utils/logger';

import { reportsApi } from './api';
import { PartyDebt, ReportsStats } from './types';
import { supabase } from '../../lib/supabaseClient';
import { reportService as accountingReportService } from '../accounting/services/reportService';


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
   * ⚡ Server-side P&L — مصدر حقيقة وحيد.
   *
   * [FIX] كان هنا استدعاء RPC مكرر بمنطق منفصل (`report_profit_loss`)
   * انحرف زمنياً عن نظيره في خدمة المحاسبة. الآن يُفوَّض إلى
   * accountingReportService.getFinancials الذي يستخدم التفصيل لكل حساب
   * (migration 20260826000012) مع رجوع آمن للتجميعي، ويُترجم الناتج إلى
   * نفس عقد الإخراج السابق حتى لا تتأثر مكونات الواجهة.
   */
  getProfitAndLoss: async (companyId: string, fromDate?: string, toDate?: string): Promise<{
    revenues: TrialBalanceItem[];
    expenses: TrialBalanceItem[];
    totalRevenues: number;
    totalExpenses: number;
    netProfit: number;
  }> => {
    const financials = await accountingReportService.getFinancials(companyId, undefined, fromDate, toDate);
    const incomeStatement = financials.incomeStatement;

    const mapRow = (row: {
      account_id: string; code: string; name: string; type: string;
      total_debit: number; total_credit: number; net_balance: number;
    }): TrialBalanceItem => ({
      id: row.account_id,
      code: row.code,
      name: row.name,
      type: row.type,
      totalDebit: Number(row.total_debit) || 0,
      totalCredit: Number(row.total_credit) || 0,
      netBalance: Number(row.net_balance) || 0,
    });

    return {
      revenues: incomeStatement.revenues.map(mapRow),
      expenses: incomeStatement.expenses.map(mapRow),
      totalRevenues: incomeStatement.totalRevenue,
      totalExpenses: incomeStatement.totalExpense,
      netProfit: incomeStatement.netIncome
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
   * `report_debts` returns:
   *   { summary: { receivables, payables }, debts: [{id,name,type,remaining_amount}] }
   * type='both' rows are split by sign → customer (receivable) / supplier (payable).
   */
  getDebtReport: async (companyId: string): Promise<ReportsStats> => {
    const [{ data: company }, { data, error }] = await Promise.all([
      supabase
        .from('companies')
        .select('base_currency')
        .eq('id', companyId)
        .maybeSingle(),
      supabase.rpc('report_debts', {
        p_company_id: companyId
      }),
    ]);
    if (error) throw error;
    const baseCurrency = (company?.base_currency as string | undefined) || 'SAR';

    const raw = (data ?? {}) as {
      summary?: { receivables?: number; payables?: number };
      debts?: Array<{ id: string; name: string; type: string; remaining_amount: number }>;
    };

    const debts: PartyDebt[] = (raw.debts ?? []).map((r) => {
      const remaining = Number(r.remaining_amount) || 0;
      // 'both' parties (customer + supplier) are split by the sign of the balance.
      const type: PartyDebt['type'] =
        r.type === 'supplier' ? 'supplier'
        : r.type === 'both' ? (remaining >= 0 ? 'customer' : 'supplier')
        : 'customer';
      return {
        id: r.id,
        name: r.name,
        type,
        currency: baseCurrency,
        total_sales: 0,
        paid_amount: 0,
        remaining_amount: remaining,
      };
    });

    return {
      summary: {
        receivables: Number(raw.summary?.receivables) || 0,
        payables: Number(raw.summary?.payables) || 0,
        currency: baseCurrency,
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
