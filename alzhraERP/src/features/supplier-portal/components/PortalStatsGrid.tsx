import React from 'react';
import { Layers, Send, FileText, Wallet } from 'lucide-react';
import { formatCurrency } from '../../../core/utils';

interface PortalStatsGridProps {
  productsCount: number;
  rfqsCount: number;
  quotationsCount: number;
  totalQuotationsValue: number;
  currency?: string;
}

export const PortalStatsGrid: React.FC<PortalStatsGridProps> = ({
  productsCount,
  rfqsCount,
  quotationsCount,
  totalQuotationsValue,
  currency = 'SAR',
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Approved Catalog Products */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            الأصناف المعتمدة
          </span>
          <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
            {productsCount}
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* Active RFQs */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            طلبات التسعير (RFQs)
          </span>
          <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
            {rfqsCount}
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
          <Send className="w-5 h-5" />
        </div>
      </div>

      {/* Submitted Quotations */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            عروض الأسعار المرفوعة
          </span>
          <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
            {quotationsCount}
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
          <FileText className="w-5 h-5" />
        </div>
      </div>

      {/* Total Value */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            إجمالي قيمة العروض
          </span>
          <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
            {formatCurrency(totalQuotationsValue, currency)}
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
          <Wallet className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
