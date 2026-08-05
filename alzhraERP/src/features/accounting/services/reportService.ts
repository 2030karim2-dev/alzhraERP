
import { TrialBalanceItem, LedgerEntry } from '../types/index';
import { supabase } from '../../../lib/supabaseClient';


export const reportService = {
    // ⚡ Server-side ledger via RPC
    // DB: get_account_ledger(p_company_id, p_account_id, p_from, p_to) → json { openingBalance, entries[], accountType }
    getLedger: async (companyId: string, accountId: string, branchId?: string | null, fromDate?: string, toDate?: string): Promise<LedgerEntry[]> => {
        const { data, error } = await supabase.rpc('get_account_ledger', {
            p_company_id: companyId,
            p_account_id: accountId,
            ...(fromDate ? { p_from: fromDate } : {}),
            ...(toDate ? { p_to: toDate } : {})
        });
        if (error) throw error;

        const result = data as any;
        // DB returns { openingBalance, entries, accountType } - note camelCase openingBalance
        return (result?.entries || []).map((line: any) => ({
            date: line.entry_date,
            journal_id: line.journal_id || '',
            journal_entry_id: line.journal_id || '',
            entry_number: line.entry_number,
            description: line.description || '',
            debit_amount: Number(line.debit_amount) || 0,
            credit_amount: Number(line.credit_amount) || 0,
            balance: Number(line.balance) || 0,
            currency_code: line.currency_code || 'SAR',
            exchange_rate: Number(line.exchange_rate) || 1,
            foreign_amount: Number(line.foreign_amount) || 0
        }));
    },

    // DB: report_trial_balance(p_company_id, p_from, p_to, p_branch_id) → TABLE rows
    getTrialBalance: async (companyId: string, branchId?: string | null, fromDate?: string, toDate?: string): Promise<TrialBalanceItem[]> => {
        const now = new Date();
        const from = fromDate || `${now.getFullYear()}-01-01`;
        const to = toDate || now.toISOString().split('T')[0];

        const { data, error } = await supabase.rpc('report_trial_balance', {
            p_company_id: companyId,
            p_from: from,
            p_to: to,
            p_branch_id: branchId || null
        });
        if (error) throw error;

        return (data || []).map((row: any) => ({
            account_id: row.account_id,
            code: row.account_code,
            name: row.account_name,
            type: row.account_type,
            total_debit: Number(row.total_debit) || 0,
            total_credit: Number(row.total_credit) || 0,
            net_balance: Number(row.balance) || 0,
            currency_code: 'SAR'
        }));
    },

    // ⚡ Server-side financials
    // DB report_profit_loss(p_company_id, p_from, p_to, p_branch_id) → jsonb {
    //   revenues: [{id, code, name, netBalance}], expenses: [{...}],
    //   totalRevenues, totalExpenses, netProfit }
    // DB report_balance_sheet(p_company_id, p_from, p_to, p_branch_id) → jsonb {
    //   assets: [{id, code, name, netBalance}], liabilities: [...], equity: [...],
    //   totalAssets, totalLiabilities, totalEquity, netProfit, isBalanced, difference }
    getFinancials: async (companyId: string, branchId?: string | null, fromDate?: string, toDate?: string) => {
        const now = new Date();
        const from = fromDate || `${now.getFullYear()}-01-01`;
        const to = toDate || now.toISOString().split('T')[0];

        // ── P&L ──────────────────────────────────────────────────────────────
        const { data: plData, error: plError } = await supabase.rpc('report_profit_loss', {
            p_company_id: companyId,
            p_from: from,
            p_to: to,
            p_branch_id: branchId || null
        });
        if (plError) throw plError;

        const pl = (plData || {}) as any;
        const totalRevenue = Number(pl.totalRevenues) || 0;
        const totalExpense = Number(pl.totalExpenses) || 0;
        const netIncome = Number(pl.netProfit) || (totalRevenue - totalExpense);

        // Map per-account rows into TrialBalanceItem lists for the report UI.
        const mapToTBI = (items: any[], type: string, typeCode: string): TrialBalanceItem[] =>
            (items || []).map((a: any) => ({
                account_id: a.id,
                code: a.code && a.code !== '' ? a.code : typeCode,
                name: a.name || '',
                type,
                total_debit: 0,
                total_credit: 0,
                net_balance: Number(a.netBalance) || 0,
                currency_code: 'SAR'
            }));

        const revenueTBI = mapToTBI(pl.revenues, 'revenue', '4');
        const expenseTBI = mapToTBI(pl.expenses, 'expense', '5');

        // ── Balance Sheet ─────────────────────────────────────────────────────
        const { data: bsRaw, error: bsError } = await supabase.rpc('report_balance_sheet', {
            p_company_id: companyId,
            p_from: from,
            p_to: to,
            p_branch_id: branchId || null
        });
        if (bsError) throw bsError;

        const bs = (bsRaw || {}) as any;
        const totalAssets = Number(bs.totalAssets) || 0;
        const totalLiabilities = Number(bs.totalLiabilities) || 0;
        const totalEquity = Number(bs.totalEquity) || 0;

        const assetTBI = mapToTBI(bs.assets, 'asset', '1');
        const liabilityTBI = mapToTBI(bs.liabilities, 'liability', '2');
        const equityTBI = mapToTBI(bs.equity, 'equity', '3');

        return {
            incomeStatement: {
                revenues: revenueTBI,
                expenses: expenseTBI,
                netIncome,
                totalRevenue,
                totalExpense
            },
            balanceSheet: {
                assets: assetTBI,
                liabilities: liabilityTBI,
                equity: equityTBI,
                netIncome: Number(bs.netProfit) || netIncome,
                totals: {
                    assets: totalAssets,
                    liabilities: totalLiabilities,
                    equity: totalEquity
                },
                isBalanced: Boolean(bs.isBalanced ?? (Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1)),
                difference: Number(bs.difference) || (totalAssets - (totalLiabilities + totalEquity))
            }
        };
    },

    // DB: get_monthly_performance(p_company_id, p_year, p_branch_id)
    getMonthlyPerformance: async (companyId: string, year: number, branchId?: string | null) => {
        const { data, error } = await supabase.rpc('get_monthly_performance', {
            p_company_id: companyId,
            p_year: year,
            p_branch_id: branchId || null
        });
        
        if (error) throw error;

        return (data || []).map((d: any) => ({
            name: new Date(year, d.month_index, 1).toLocaleString('ar-SA', { month: 'long' }),
            revenues: Number(d.revenues) || 0,
            expenses: Number(d.expenses) || 0,
            monthIndex: d.month_index
        }));
    }
};