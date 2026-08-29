import React from 'react';
import { Send, ShoppingCart, Share2, Calendar, Package } from 'lucide-react';
import type { VendorRFQ } from '../../types';

interface RFQsTabProps {
  rfqs: VendorRFQ[];
  onOpenQuotationFromRFQ: (rfq: VendorRFQ) => void;
}

export const RFQsTab: React.FC<RFQsTabProps> = ({
  rfqs,
  onOpenQuotationFromRFQ,
}) => {
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
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="bg-[var(--app-surface)] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          طلبات التسعير الحالية (RFQs)
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {rfqs.length} طلبات نشطة
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rfqs.map(rfq => (
          <div
            key={rfq.rfq_id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors flex flex-col justify-between space-y-3 bg-slate-50/40 dark:bg-slate-800/20"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                  {rfq.rfq_number}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {rfq.status}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug line-clamp-2">
                {rfq.title}
              </h4>

              <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  <span>{rfq.items_count} أصناف</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>الموعد: {rfq.submission_deadline ? rfq.submission_deadline.slice(0, 10) : '---'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(rfq)}
                className="p-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors"
                title="مشاركة عبر واتساب"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onOpenQuotationFromRFQ(rfq)}
                className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>تقديم عرض سعر</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {rfqs.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <Send className="w-8 h-8 stroke-[1.5] mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            لا توجد طلبات تسعير نشطة حالياً
          </p>
        </div>
      )}
    </div>
  );
};
