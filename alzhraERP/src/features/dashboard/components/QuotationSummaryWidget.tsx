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
    queryFn: () =>
      companyId
        ? salesQuotationsApi.getQuotations(companyId)
        : Promise.resolve({ data: [], error: null }),
    enabled: !!companyId,
  });

  const { data: purchaseQuots, isLoading: purchaseLoading } = useQuery<{
    data: Array<Record<string, unknown>>;
    error: unknown;
  }>({
    queryKey: ['purchase_quotations_summary', companyId],
    queryFn: () =>
      companyId
        ? (purchaseQuotationsApi.getQuotations(companyId) as unknown as Promise<{
            data: Array<Record<string, unknown>>;
            error: unknown;
          }>)
        : Promise.resolve({ data: [], error: null }),
    enabled: !!companyId,
  });

  const salesStats = React.useMemo(() => {
    const data = (salesQuots?.data || []) as Array<{ status?: string }>;
    return {
      pending: data.filter(
        q => typeof q.status === 'string' && ['draft', 'sent'].includes(q.status)
      ).length,
      accepted: data.filter(q => q.status === 'accepted').length,
    };
  }, [salesQuots]);

  const purchaseStats = React.useMemo(() => {
    const data = (purchaseQuots?.data || []) as Array<{ status?: string }>;
    return {
      pending: data.filter(
        q => typeof q.status === 'string' && ['draft', 'sent'].includes(q.status)
      ).length,
    };
  }, [purchaseQuots]);

  // آخر تحديث يُشتق من بيانات العروض الفعلية (updated_at/created_at) بدلاً من
  // وقت المتصفح الذي كان يظهر وقتاً مضللاً في كل تحميل.
  const lastUpdated = React.useMemo(() => {
    const timestamps = [
      ...((salesQuots?.data as unknown as Array<Record<string, unknown>>) || []),
      ...((purchaseQuots?.data as unknown as Array<Record<string, unknown>>) || []),
    ]
      .map(q => {
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
      <div className="animate-pulse rounded-3xl border border-gray-100 bg-[var(--app-surface)] p-6 shadow-sm dark:border-slate-800 max-md:rounded-xl max-md:p-3">
        <div className="mb-4 h-6 w-32 rounded bg-gray-100 dark:bg-slate-800 max-md:mb-3"></div>
        <div className="grid grid-cols-2 gap-4 max-md:gap-3">
          <div className="h-20 rounded-2xl bg-gray-50 dark:bg-slate-800/50 max-md:rounded-xl"></div>
          <div className="h-20 rounded-2xl bg-gray-50 dark:bg-slate-800/50 max-md:rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-3xl border border-gray-100 bg-[var(--app-surface)] p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 max-md:rounded-xl max-md:p-3">
      <div className="mb-5 flex items-center justify-between max-md:mb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
            <FileText size={18} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">عروض الأسعار</h3>
        </div>
        <button
          onClick={() => {
            navigate('/sales');
          }}
          className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-600"
        >
          عرض الكل
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Sales Quotations */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-blue-100/50 bg-blue-50/50 p-3 dark:border-blue-800/20 dark:bg-blue-900/10 max-md:rounded-xl">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                عروض المبيعات
              </span>
              <ArrowUpRight size={12} className="text-blue-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold leading-none text-gray-900 dark:text-white">
                {salesStats.pending + salesStats.accepted}
              </span>
              {salesStats.accepted > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/20">
                  <CheckCircle size={8} /> {salesStats.accepted} مقبول
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Purchase Quotations */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-violet-100/50 bg-violet-50/50 p-3 dark:border-violet-800/20 dark:bg-violet-900/10 max-md:rounded-xl">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                عروض المشتريات
              </span>
              <ArrowDownLeft size={12} className="text-violet-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold leading-none text-gray-900 dark:text-white">
                {purchaseStats.pending}
              </span>
              <span className="rounded-full bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-400 dark:bg-slate-800">
                قيد التفاوض
              </span>
            </div>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="mt-4 border-t border-gray-50 pt-3 dark:border-slate-800/50 max-md:mt-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <Clock size={10} />
            <span>
              آخر تحديث:{' '}
              {lastUpdated.toLocaleTimeString('ar-SA-u-nu-latn', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationSummaryWidget;
