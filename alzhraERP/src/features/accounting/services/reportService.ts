
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

    // DB: report_trial_balance(p_company_id, p_from, p_to, p_branch_id) → TABLE rows with correct column names
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
    // DB report_profit_loss(p_company_id, p_from, p_to) → TABLE rows: { category, amount, type }
    //    where type ∈ ('revenue', 'expense', 'net_profit')
    // DB report_balance_sheet(p_company_id, p_as_of_date) → TABLE rows: { category, amount, type }
    //    where type ∈ ('asset', 'liability', 'equity')
    getFinancials: async (companyId: string, branchId?: string | null, fromDate?: string, toDate?: string) => {
        const now = new Date();
        const from = fromDate || `${now.getFullYear()}-01-01`;
        const to = toDate || now.toISOString().split('T')[0];

        // ── P&L ──────────────────────────────────────────────────────────────
        // report_profit_loss signature: (p_company_id uuid, p_from date, p_to date)
        // NO p_branch_id parameter in DB – omit it to avoid error
        const { data: plRows, error: plError } = await supabase.rpc('report_profit_loss', {
            p_company_id: companyId,
            p_from: from,
            p_to: to
        });
        if (plError) throw plError;

        const plData = (plRows || []) as Array<{ category: string; amount: number; type: string }>;
        const revenueRow = plData.find(r => r.type === 'revenue');
        const expenseRow = plData.find(r => r.type === 'expense');
        const netRow     = plData.find(r => r.type === 'net_profit');

        const totalRevenue = Number(revenueRow?.amount) || 0;
        const totalExpense = Number(expenseRow?.amount) || 0;
        const netIncome    = Number(netRow?.amount)     || (totalRevenue - totalExpense);

        // Build mock list items so existing components can iterate
        const revenueTBI: TrialBalanceItem[] = revenueRow ? [{
            account_id: 'revenue-total', code: '4', name: revenueRow.category,
            type: 'revenue', total_debit: 0, total_credit: totalRevenue,
            net_balance: totalRevenue, currency_code: 'SAR'
        }] : [];
        const expenseTBI: TrialBalanceItem[] = expenseRow ? [{
            account_id: 'expense-total', code: '5', name: expenseRow.category,
            type: 'expense', total_debit: totalExpense, total_credit: 0,
            net_balance: totalExpense, currency_code: 'SAR'
        }] : [];

        // ── Balance Sheet ─────────────────────────────────────────────────────
        // report_balance_sheet signature: (p_company_id uuid, p_as_of_date date DEFAULT NULL)
        const { data: bsRows, error: bsError } = await supabase.rpc('report_balance_sheet', {
            p_company_id: companyId,
            p_as_of_date: to
        });
        if (bsError) throw bsError;

        const bsData = (bsRows || []) as Array<{ category: string; amount: number; type: string }>;
        const assetRow     = bsData.find(r => r.type === 'asset');
        const liabilityRow = bsData.find(r => r.type === 'liability');
        const equityRow    = bsData.find(r => r.type === 'equity');

        const totalAssets      = Number(assetRow?.amount)     || 0;
        const totalLiabilities = Number(liabilityRow?.amount) || 0;
        const totalEquity      = Number(equityRow?.amount)    || 0;

        const assetTBI: TrialBalanceItem[] = assetRow ? [{
            account_id: 'asset-total', code: '1', name: assetRow.category,
            type: 'asset', total_debit: totalAssets, total_credit: 0,
            net_balance: totalAssets, currency_code: 'SAR'
        }] : [];
        const liabilityTBI: TrialBalanceItem[] = liabilityRow ? [{
            account_id: 'liability-total', code: '2', name: liabilityRow.category,
            type: 'liability', total_debit: 0, total_credit: totalLiabilities,
            net_balance: totalLiabilities, currency_code: 'SAR'
        }] : [];
        const equityTBI: TrialBalanceItem[] = equityRow ? [{
            account_id: 'equity-total', code: '3', name: equityRow.category,
            type: 'equity', total_debit: 0, total_credit: totalEquity,
            net_balance: totalEquity, currency_code: 'SAR'
        }] : [];

        const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

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
                netIncome,
                totals: {
                    assets: totalAssets,
                    liabilities: totalLiabilities,
                    equity: totalEquity
                },
                isBalanced,
                difference: totalAssets - (totalLiabilities + totalEquity)
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