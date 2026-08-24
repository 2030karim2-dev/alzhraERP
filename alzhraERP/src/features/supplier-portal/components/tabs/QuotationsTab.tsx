import React from 'react';
import { FileText } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import type { VendorQuotation } from '../../types';

interface QuotationsTabProps {
  quotations: VendorQuotation[];
  onOpenHistory: (quotationId: string, quotationNumber: string) => void;
  onEditQuotation: (quotation: VendorQuotation) => void;
}

export const QuotationsTab: React.FC<QuotationsTabProps> = ({
  quotations,
  onOpenHistory,
  onEditQuotation,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
          عروض الأسعار المعتمدة والمراجعات
        </span>
        <span className="text-xs font-semibold text-slate-400">
          إجمالي العروض: {quotations.length}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {quotations.map(quote => (
          <div
            key={quote.quotation_id}
            className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold text-xs">
                #{quote.current_revision_number}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {quote.quotation_number}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                    {quote.status}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {quote.supplier_name} • {quote.items.length} أصناف
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-left">
                <span className="font-mono font-bold text-base text-slate-900 dark:text-white block" dir="ltr">
                  {formatCurrency(quote.total_amount, quote.currency)}
                </span>
                <span className="text-[10px] text-slate-400">
                  صالح حتى: {quote.valid_until || '---'}
                </span>
              </div>

              <button
                onClick={() => onOpenHistory(quote.quotation_id, quote.quotation_number)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                سجل المراجعات
              </button>

              <button
                onClick={() => onEditQuotation(quote)}
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:text-indigo-400 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                تعديل / مراجعة
              </button>
            </div>
          </div>
        ))}

        {quotations.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-12 h-12 stroke-[1.5] mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              لا توجد عروض أسعار مسجلة
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
