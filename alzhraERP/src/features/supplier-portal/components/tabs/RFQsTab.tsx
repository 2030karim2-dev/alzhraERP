import React from 'react';
import { Send, ShoppingCart } from 'lucide-react';
import type { VendorRFQ } from '../../types';

interface RFQsTabProps {
  rfqs: VendorRFQ[];
  onOpenQuotationFromRFQ: (rfq: VendorRFQ) => void;
}

export const RFQsTab: React.FC<RFQsTabProps> = ({
  rfqs,
  onOpenQuotationFromRFQ,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          طلبات التسعير الحالية (RFQs)
        </h3>
        <span className="text-xs font-semibold text-slate-400">
          إجمالي الطلبات: {rfqs.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rfqs.map(rfq => (
          <div
            key={rfq.rfq_id}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all flex flex-col justify-between space-y-4 bg-slate-50/40 dark:bg-slate-800/20"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                  {rfq.rfq_number}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold">
                  {rfq.status}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {rfq.title}
              </h4>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span>عدد البنود: {rfq.items_count}</span>
                <span>•</span>
                <span>آخر موعد: {rfq.submission_deadline.slice(0, 10)}</span>
              </div>
            </div>

            <button
              onClick={() => onOpenQuotationFromRFQ(rfq)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>رد وتقديم عرض سعر</span>
            </button>
          </div>
        ))}
      </div>

      {rfqs.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <Send className="w-12 h-12 stroke-[1.5] mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            لا توجد طلبات تسعير نشطة حالياً
          </p>
        </div>
      )}
    </div>
  );
};
