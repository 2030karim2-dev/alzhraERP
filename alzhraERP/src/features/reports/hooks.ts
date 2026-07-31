import { useQuery } from '@tanstack/react-query';
import { reportsService } from './service';
import { useAuthStore } from '../auth/store';
import { supabase } from '../../lib/supabaseClient';

// Typed result shape from report_trial_balance RPC
interface TrialBalanceRow {
    account_id: string;
    account_code: string;
    account_name: string;
    total_debit: number;
    total_credit: number;
    balance: number;
}

export const useTrialBalance = (fromDate?: string, toDate?: string, options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['trial_balance', user?.company_id, fromDate, toDate],
        queryFn: async () => {
            if (!user?.company_id) return [];
            const { data, error } = await supabase.rpc('report_trial_balance', {
                p_company_id: user.company_id,
                p_from: fromDate || '2000-01-01',
                p_to: toDate || new Date().toISOString().split('T')[0]
            });
            if (error) throw error;
            return ((data as TrialBalanceRow[] | null) || []).map((row) => ({
                id: row.account_id,
                code: row.account_code,
                name: row.account_name,
                totalDebit: Number(row.total_debit),
                totalCredit: Number(row.total_credit),
                netBalance: Number(row.balance)
            }));
        },
        enabled: (options.enabled !== false) && !!user?.company_id,
    });
};

export const useProfitAndLoss = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['profit_loss', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return null;
            // ⚡ Server-side P&L via RPC — no frontend account code filtering
            const { data, error } = await supabase.rpc('report_profit_loss', {
                p_company_id: user.company_id
            });

            if (error) {
                console.error("Profit and Loss RPC Error:", error);
                throw error;
            }

            const result = data as any;
            return {
                revenues: (result.revenues || []).map((r: any) => ({ id: r.id, name: r.name, netBalance: r.netBalance })),
                expenses: (result.expenses || []).map((e: any) => ({ id: e.id, name: e.name, netBalance: e.netBalance })),
                totalRevenues: result.totalRevenues || 0,
                totalExpenses: result.totalExpenses || 0,
                netProfit: result.netProfit || 0
            };
        },
        enabled: (options.enabled !== false) && !!user?.company_id,
    });
};

export const useDebtReport = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['debt_report', user?.company_id],
        queryFn: () => user?.company_id ? reportsService.getDebtReport(user.company_id) : Promise.reject("No Auth"),
        enabled: (options.enabled !== false) && !!user?.company_id,
    });
};

export const useBalanceSheet = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['balance_sheet', user?.company_id],
        queryFn: () => user?.company_id ? reportsService.getBalanceSheet(user.company_id) : Promise.resolve(null),
        enabled: (options.enabled !== false) && !!user?.company_id,
    });
};

export const useCurrencyDiffs = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['currency_diffs', user?.company_id],
        queryFn: () => user?.company_id ? reportsService.getCurrencyDiffs(user.company_id) : Promise.resolve([]),
        enabled: (options.enabled !== false) && !!user?.company_id,
    });
};

export const useCashFlow = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['cash_flow', user?.company_id],
        queryFn: () => user?.company_id ? reportsService.getCashFlow(user.company_id) : Promise.resolve(null),
        enabled: (options.enabled !== false) && !!user?.company_id,
    });
};