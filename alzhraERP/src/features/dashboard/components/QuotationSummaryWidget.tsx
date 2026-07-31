import React from 'react';
import { FileText, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { salesQuotationsApi } from '../../sales/api/quotationsApi';
import { purchaseQuotationsApi } from '../../purchases/api/quotationsApi';
import { useAuthStore } from '../../auth/store';
// Removed unused cn

const QuotationSummaryWidget: React.FC = () => {
    const { user } = useAuthStore();
    const companyId = user?.company_id;

    const { data: salesQuots, isLoading: salesLoading } = useQuery({
        queryKey: ['sales_quotations_summary', companyId],
        queryFn: () => companyId ? salesQuotationsApi.getQuotations(companyId) : Promise.resolve({ data: [], error: null }),
        enabled: !!companyId,
    });

    const { data: purchaseQuots, isLoading: purchaseLoading } = useQuery({
        queryKey: ['purchase_quotations_summary', companyId],
        queryFn: () => companyId ? purchaseQuotationsApi.getQuotations(companyId) : Promise.resolve({ data: [], error: null }),
        enabled: !!companyId,
    });

    const salesStats = React.useMemo(() => {
        const data = salesQuots?.data || [];
        return {
            pending: data.filter((q: any) => ['draft', 'sent'].includes(q.status)).length,
            accepted: data.filter((q: any) => q.status === 'accepted').length,
        };
    }, [salesQuots]);

    const purchaseStats = React.useMemo(() => {
        const data = purchaseQuots?.data || [];
        return {
            pending: data.filter((q: any) => ['draft', 'sent'].includes(q.status)).length,
        };
    }, [purchaseQuots]);

    const isLoading = salesLoading || purchaseLoading;

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm animate-pulse">
                <div className="h-6 w-32 bg-gray-100 dark:bg-slate-800 rounded mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-gray-50 dark:bg-slate-800/50 rounded-2xl"></div>
                    <div className="h-20 bg-gray-50 dark:bg-slate-800/50 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <FileText size={18} />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">عروض الأسعار</h3>
                </div>
                <button 
                  onClick={() => window.location.href = '/sales'} // Fallback for simple navigation
                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-wider"
                >
                    عرض الكل
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Sales Quotations */}
                <div className="space-y-3">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20">
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
                    <div className="p-3 bg-violet-50/50 dark:bg-violet-900/10 rounded-2xl border border-violet-100/50 dark:border-violet-800/20">
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

            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/50">
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <Clock size={10} />
                    <span>آخر تحديث: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        </div>
    );
};

export default QuotationSummaryWidget;
