import React from 'react';
import { FileText, Share2, Edit3, History } from 'lucide-react';
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
  const handleShareWhatsApp = (quote: VendorQuotation) => {
    const lines = [
      `*عرض سعر من الزهراء ERP*`,
      `رقم العرض: ${quote.quotation_number}`,
      `المورد: ${quote.supplier_name}`,
      `المراجعة: #${quote.current_revision_number}`,
      `الإجمالي: ${formatCurrency(quote.total_amount, quote.currency)}`,
      `صالح حتى: ${quote.valid_until || '---'}`,
      `عدد الأصناف: ${quote.items.length} صنف`,
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'converted':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'submitted':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'rejected':
        return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="bg-[var(--app-surface)] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
          عروض الأسعار المعتمدة والمراجعات
        </span>
        <span className="text-[11px] font-medium text-slate-400">
          {quotations.length} عروض
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {quotations.map(quote => (
          <div
            key={quote.quotation_id}
            className="p-3 px-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
          >
            {/* Left Info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                #{quote.current_revision_number}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {quote.quotation_number}
                  </span>
                  <span className={`px-2 py-0.2 rounded-md border text-[10px] font-bold ${getStatusBadge(quote.status)}`}>
                    {quote.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{quote.supplier_name}</span>
                  <span className="mx-1.5">•</span>
                  <span>{quote.items.length} أصناف</span>
                  {quote.valid_until && (
                    <>
                      <span className="mx-1.5">•</span>
                      <span>صالح حتى: {quote.valid_until}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Amounts & Actions */}
            <div className="flex items-center gap-3">
              <div className="text-left">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white block" dir="ltr">
                  {formatCurrency(quote.total_amount, quote.currency)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  صافي العرض
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(quote)}
                  className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors"
                  title="مشاركة عبر واتساب"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenHistory(quote.quotation_id, quote.quotation_number)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>السجل</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEditQuotation(quote)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {quotations.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <FileText className="w-8 h-8 stroke-[1.5] mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              لا توجد عروض أسعار مسجلة
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
