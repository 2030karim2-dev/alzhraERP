import React from 'react';
import { FileText, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { salesQuotationsApi } from '../../sales/api/quotationsApi';
import { purchaseQuotationsApi } from '../../purchases/api/quotationsApi';
import { useAuthStore } from '../../auth/store';

const QuotationSummaryWidget: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const companyId = user?.company_id;

    const { data: salesQuots, isLoading: salesLoading } = useQuery({
        queryKey: ['sales_quotations_summary', companyId],
        queryFn: () => companyId ? salesQuotationsApi.getQuotations(companyId) : Promise.resolve({ data: [], error: null }),
        enabled: !!companyId,
    });

    const { data: purchaseQuots, isLoading: purchaseLoading } = useQuery<{ data: Array<Record<string, unknown>>; error: unknown }>({
        queryKey: ['purchase_quotations_summary', companyId],
        queryFn: () => companyId
            ? (purchaseQuotationsApi.getQuotations(companyId) as unknown as Promise<{ data: Array<Record<string, unknown>>; error: unknown }>)
            : Promise.resolve({ data: [], error: null }),
        enabled: !!companyId,
    });

    const salesStats = React.useMemo(() => {
        const data = (salesQuots?.data || []) as Array<{ status?: string }>;
        return {
            pending: data.filter((q) => typeof q.status === 'string' && ['draft', 'sent'].includes(q.status)).length,
            accepted: data.filter((q) => q.status === 'accepted').length,
        };
    }, [salesQuots]);

    const purchaseStats = React.useMemo(() => {
        const data = (purchaseQuots?.data || []) as Array<{ status?: string }>;
        return {
            pending: data.filter((q) => typeof q.status === 'string' && ['draft', 'sent'].includes(q.status)).length,
        };
    }, [purchaseQuots]);

    // آخر تحديث يُشتق من بيانات العروض الفعلية (updated_at/created_at) بدلاً من
    // وقت المتصفح الذي كان يظهر وقتاً مضللاً في كل تحميل.
    const lastUpdated = React.useMemo(() => {
        const timestamps = [
            ...((salesQuots?.data as unknown as Array<Record<string, unknown>>) || []),
            ...((purchaseQuots?.data as unknown as Array<Record<string, unknown>>) || []),
        ]
            .map((q) => {
                if (typeof q.updated_at === 'string' && q.updated_at) return q.updated_at;
                if (typeof q.created_at === 'string' && q.created_at) return q.created_at;
                return '';
            })
            .filter(Boolean)
            .sort()
            .reverse();
        return timestamps.length > 0 ? new Date(timestamps[0]) : null;
    }, [salesQuots, purchaseQuots]);

    const isLoading = salesLoading || purchaseLoading;

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-md:rounded-xl p-6 max-md:p-3 max-md:p-6 border border-gray-100 dark:border-slate-800 shadow-sm animate-pulse">
                <div className="h-6 w-32 bg-gray-100 dark:bg-slate-800 rounded mb-4 max-md:mb-3"></div>
                <div className="grid grid-cols-2 gap-4 max-md:gap-3">
                    <div className="h-20 bg-gray-50 dark:bg-slate-800/50 rounded-2xl max-md:rounded-xl"></div>
                    <div className="h-20 bg-gray-50 dark:bg-slate-800/50 rounded-2xl max-md:rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-md:rounded-xl p-5 max-md:p-3 max-md:p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-5 max-md:mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <FileText size={18} />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">عروض الأسعار</h3>
                </div>
                <button 
                  onClick={() => { navigate('/sales'); }}
                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-wider"
                >
                    عرض الكل
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Sales Quotations */}
                <div className="space-y-3">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl max-md:rounded-xl border border-blue-100/50 dark:border-blue-800/20">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">عروض المبيعات</span>
                            <ArrowUpRight size={12} className="text-blue-400" />
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                                {salesStats.pending + salesStats.accepted}
                            </span>
                            {salesStats.accepted > 0 && (
                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                                    <CheckCircle size={8} /> {salesStats.accepted} مقبول
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Purchase Quotations */}
                <div className="space-y-3">
                    <div className="p-3 bg-violet-50/50 dark:bg-violet-900/10 rounded-2xl max-md:rounded-xl border border-violet-100/50 dark:border-violet-800/20">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">عروض المشتريات</span>
                            <ArrowDownLeft size={12} className="text-violet-400" />
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                                {purchaseStats.pending}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                قيد التفاوض
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {lastUpdated && (
                <div className="mt-4 max-md:mt-3 pt-3 border-t border-gray-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <Clock size={10} />
                        <span>آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotationSummaryWidget;
