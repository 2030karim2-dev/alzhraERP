
import { TrialBalanceItem, LedgerEntry } from '../types/index';
import { supabase } from '../../../lib/supabaseClient';

interface LedgerRpcLine {
    entry_date: string | undefined;
    journal_id: string | undefined;
    entry_number: number | undefined;
    branch_id?: string | null | undefined;
    description: string | undefined;
    debit_amount: number | undefined;
    credit_amount: number | undefined;
    balance: number | undefined;
    currency_code: string | undefined;
    exchange_rate: number | undefined;
    foreign_amount: number | undefined;
    party_id: string | undefined;
    party_name: string | undefined;
}

interface LedgerRpcResult {
    entries?: LedgerRpcLine[];
}

interface TrialBalanceRpcRow {
    account_id: string;
    account_code: string;
    account_name: string;
    account_type: string;
    total_debit: number;
    total_credit: number;
    balance: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const toLedgerResult = (value: unknown): LedgerRpcResult => {
    if (!isRecord(value) || !Array.isArray(value.entries)) return { entries: [] };
    return { entries: value.entries.filter(isRecord).map((line) => ({
        entry_date: typeof line.entry_date === 'string' ? line.entry_date : undefined,
        journal_id: typeof line.journal_id === 'string' ? line.journal_id : undefined,
        entry_number: typeof line.entry_number === 'number' ? line.entry_number : undefined,
        description: typeof line.description === 'string' ? line.description : undefined,
        debit_amount: typeof line.debit_amount === 'number' ? line.debit_amount : undefined,
        credit_amount: typeof line.credit_amount === 'number' ? line.credit_amount : undefined,
        balance: typeof line.balance === 'number' ? line.balance : undefined,
        currency_code: typeof line.currency_code === 'string' ? line.currency_code : undefined,
        exchange_rate: typeof line.exchange_rate === 'number' ? line.exchange_rate : undefined,
        foreign_amount: typeof line.foreign_amount === 'number' ? line.foreign_amount : undefined,
        branch_id: typeof line.branch_id === 'string' ? line.branch_id : undefined,
        party_id: typeof line.party_id === 'string' ? line.party_id : undefined,
        party_name: typeof line.party_name === 'string' ? line.party_name : undefined,
    })) };
};

const toTrialBalanceRows = (value: unknown): TrialBalanceRpcRow[] => {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).flatMap((row) => {
        if (
            typeof row.account_id !== 'string' ||
            typeof row.account_code !== 'string' ||
            typeof row.account_name !== 'string' ||
            typeof row.account_type !== 'string' ||
            typeof row.total_debit !== 'number' ||
            typeof row.total_credit !== 'number' ||
            typeof row.balance !== 'number'
        ) return [];
        return [{
            account_id: row.account_id,
            account_code: row.account_code,
            account_name: row.account_name,
            account_type: row.account_type,
            total_debit: row.total_debit,
            total_credit: row.total_credit,
            balance: row.balance,
        }];
    });
};

export const reportService = {
    // ⚡ Server-side ledger via RPC
    // DB: get_account_ledger(p_company_id, p_account_id, p_from, p_to, p_branch_id)
    //     → json { openingBalance, entries[], accountType }
    getLedger: async (companyId: string, accountId: string, branchId?: string | null, fromDate?: string, toDate?: string): Promise<LedgerEntry[]> => {
        const { data, error } = await supabase.rpc('get_account_ledger', {
            p_company_id: companyId,
            p_account_id: accountId,
            ...(fromDate ? { p_from: fromDate } : {}),
            ...(toDate ? { p_to: toDate } : {}),
            ...(branchId ? { p_branch_id: branchId } : {})
        });
        if (error) throw error;

        const result = toLedgerResult(data);
        // NOTE: the RPC returns `openingBalance` (camelCase) — e.g.
        // json_build_object('openingBalance', v_opening_balance, 'entries', …)
        const openingBalance = Number(
            (data as unknown as { openingBalance?: number | null } | null)?.openingBalance ?? 0
        );

        const entries = (result.entries ?? []).map((line: LedgerRpcLine) => ({
            date: line.entry_date ?? '',
            journal_id: line.journal_id ?? '',
            journal_entry_id: line.journal_id ?? '',
            entry_number: line.entry_number ?? 0,
            description: line.description ?? '',
            debit_amount: line.debit_amount ?? 0,
            credit_amount: line.credit_amount ?? 0,
            balance: line.balance ?? 0,
            currency_code: line.currency_code ?? 'SAR',
            exchange_rate: line.exchange_rate ?? 1,
            foreign_amount: line.foreign_amount ?? 0,
            ...(line.branch_id != null ? { branch_id: line.branch_id } : {}),
            ...(line.party_id ? { party_id: line.party_id } : {}),
            ...(line.party_name ? { party_name: line.party_name } : {}),
        }));

        // عرض الرصيد الافتتاحي (الأرصدة قبل تاريخ البداية) كسطر أول في كشف الحساب
        if (openingBalance !== 0) {
            entries.unshift({
                date: fromDate || '',
                journal_id: '',
                journal_entry_id: '',
                entry_number: 0,
                description: 'رصيد افتتاحي',
                debit_amount: 0,
                credit_amount: 0,
                balance: openingBalance,
                currency_code: 'SAR',
                exchange_rate: 1,
                foreign_amount: 0,
            });
        }

        return entries;
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
            ...(branchId ? { p_branch_id: branchId } : {})
        });
        if (error) throw error;

        return toTrialBalanceRows(data).map((row: TrialBalanceRpcRow) => ({
            account_id: row.account_id,
            code: row.account_code,
            name: row.account_name,
            type: row.account_type,
            total_debit: row.total_debit,
            total_credit: row.total_credit,
            net_balance: row.balance,
            currency_code: 'SAR'
        }));
    },

    // ⚡ Server-side financials
    // DB report_profit_loss(p_company_id, p_from, p_to) → TABLE rows: { category, amount, type }
    //    where type ∈ ('revenue', 'expense', 'net_profit')
    // DB report_balance_sheet(p_company_id, p_as_of_date) → TABLE rows: { category, amount, type }
    //    where type ∈ ('asset', 'liability', 'equity')
    getFinancials: async (companyId: string, _branchId?: string | null, fromDate?: string, toDate?: string) => {
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

        const equityFromServer = Number(equityRow?.amount)    || 0;
        const totalAssets      = Number(assetRow?.amount)     || 0;
        const totalLiabilities = Number(liabilityRow?.amount) || 0;
        // حقوق الملكية تُعرض منفصلة عن بند صافي أرباح/خسائر الفترة، لكن إجمالي
        // الميزانية يجب أن يشمل صافي الربح حتى يتحقق التوازن:
        //   الأصول = الخصوم + حقوق الملكية + صافي الربح
        const totalEquity      = equityFromServer + netIncome;

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
            type: 'equity', total_debit: 0, total_credit: equityFromServer,
            net_balance: equityFromServer, currency_code: 'SAR'
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

        return (data || []).map((d) => ({
            name: new Date(year, d.month_index, 1).toLocaleString('en-US', { month: 'long' }),
            revenues: Number(d.revenues) || 0,
            expenses: Number(d.expenses) || 0,
            monthIndex: d.month_index
        }));
    }
};