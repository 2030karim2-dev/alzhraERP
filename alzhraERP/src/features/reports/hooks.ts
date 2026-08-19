import { useQuery } from '@tanstack/react-query';
import { reportsService } from './service';
import { useAuthStore } from '../auth/store';

export const useTrialBalance = (fromDate?: string, toDate?: string, options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    const today = new Date().toISOString().split('T')[0];
    return useQuery({
        queryKey: ['trial_balance', user?.company_id, fromDate, toDate],
        queryFn: () => user?.company_id
            // يمر عبر طبقة الخدمة (reportsService) بدلاً من استدعاء supabase مباشرة
            ? reportsService.getTrialBalance(user.company_id, fromDate || '2000-01-01', toDate || today)
            : Promise.resolve([]),
        enabled: (options.enabled !== false) && !!user?.company_id,
        staleTime: 5 * 60 * 1000, // 5 min
    });
};

export const useProfitAndLoss = (fromDate?: string, toDate?: string, options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    const today = new Date().toISOString().split('T')[0];
    return useQuery({
        queryKey: ['profit_loss', user?.company_id, fromDate, toDate],
        queryFn: () => user?.company_id
            // ⚡ Server-side P&L عبر طبقة الخدمة — لا فلترة أكواد حسابات في الواجهة
            ? reportsService.getProfitAndLoss(user.company_id, fromDate || '2000-01-01', toDate || today)
            : Promise.resolve(null),
        enabled: (options.enabled !== false) && !!user?.company_id,
        staleTime: 5 * 60 * 1000, // 5 min
    });
};

export const useDebtReport = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['debt_report', user?.company_id],
        queryFn: () => user?.company_id ? reportsService.getDebtReport(user.company_id) : Promise.reject("No Auth"),
        enabled: (options.enabled !== false) && !!user?.company_id,
        staleTime: 5 * 60 * 1000, // 5 min
    });
};

export const useBalanceSheet = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['balance_sheet', user?.company_id],
        queryFn: () => user?.company_id ? reportsService.getBalanceSheet(user.company_id) : Promise.resolve(null),
        enabled: (options.enabled !== false) && !!user?.company_id,
        staleTime: 5 * 60 * 1000, // 5 min
    });
};

export const useCurrencyDiffs = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['currency_diffs', user?.company_id],
        queryFn: () => user?.company_id ? reportsService.getCurrencyDiffs(user.company_id) : Promise.resolve([]),
        enabled: (options.enabled !== false) && !!user?.company_id,
        staleTime: 5 * 60 * 1000, // 5 min
    });
};

export const useCashFlow = (options: { enabled?: boolean } = {}) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['cash_flow', user?.company_id],
        queryFn: () => user?.company_id ? reportsService.getCashFlow(user.company_id) : Promise.resolve(null),
        enabled: (options.enabled !== false) && !!user?.company_id,
        // بيانات سيولة مالية حساسة — دقيقة واحدة فقط بدل 5 (تُحدَّث لحظيًا عبر Realtime أيضًا)
        staleTime: 60 * 1000, // 1 min
    });
};