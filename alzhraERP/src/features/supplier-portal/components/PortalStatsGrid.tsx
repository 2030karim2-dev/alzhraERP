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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Approved Products */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            الأصناف المعتمدة
          </span>
          <span className="font-mono text-xl font-bold text-slate-900 dark:text-white">
            {productsCount}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
          <Layers className="w-4 h-4" />
        </div>
      </div>

      {/* Active RFQs */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            طلبات التسعير (RFQs)
          </span>
          <span className="font-mono text-xl font-bold text-slate-900 dark:text-white">
            {rfqsCount}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <Send className="w-4 h-4" />
        </div>
      </div>

      {/* Submitted Quotes */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            عروض الأسعار المرفوعة
          </span>
          <span className="font-mono text-xl font-bold text-slate-900 dark:text-white">
            {quotationsCount}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      </div>

      {/* Total Value */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            إجمالي قيمة العروض
          </span>
          <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
            {formatCurrency(totalQuotationsValue, currency)}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <Wallet className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
