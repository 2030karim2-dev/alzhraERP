import React from 'react';
import { Send, ShoppingCart, Share2, Calendar, Package } from 'lucide-react';
import type { VendorRFQ } from '../../types';

interface RFQsTabProps {
  rfqs: VendorRFQ[];
  onOpenQuotationFromRFQ: (rfq: VendorRFQ) => void;
}

export const RFQsTab: React.FC<RFQsTabProps> = ({ rfqs, onOpenQuotationFromRFQ }) => {
  const handleShareWhatsApp = (rfq: VendorRFQ) => {
    const lines = [
      `*طلب تسعير جديد من الزهراء ERP*`,
      `رقم الطلب: ${rfq.rfq_number}`,
      `العنوان: ${rfq.title}`,
      `عدد الأصناف: ${rfq.items_count} صنف`,
      `آخر موعد للتقديم: ${rfq.submission_deadline ? rfq.submission_deadline.slice(0, 10) : '---'}`,
      `يرجى تقديم عرض السعر عبر بوابة الموردين.`,
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-3 overflow-hidden rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          طلبات التسعير الحالية (RFQs)
        </h3>
        <span className="text-xs font-medium text-slate-400">{rfqs.length} طلبات نشطة</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rfqs.map(rfq => (
          <div
            key={rfq.rfq_id}
            className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-colors hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-800/20 dark:hover:border-indigo-600"
          >
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {rfq.rfq_number}
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {rfq.status}
                </span>
              </div>

              <h4 className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 dark:text-white">
                {rfq.title}
              </h4>

              <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  <span>{rfq.items_count} أصناف</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    الموعد: {rfq.submission_deadline ? rfq.submission_deadline.slice(0, 10) : '---'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200/60 pt-2 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleShareWhatsApp(rfq);
                }}
                className="rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                title="مشاركة عبر واتساب"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenQuotationFromRFQ(rfq);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>تقديم عرض سعر</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {rfqs.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <Send className="mx-auto mb-2 h-8 w-8 stroke-[1.5] text-slate-300 dark:text-slate-600" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            لا توجد طلبات تسعير نشطة حالياً
          </p>
        </div>
      )}
    </div>
  );
};
