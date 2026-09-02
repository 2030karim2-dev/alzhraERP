import React from 'react';
import { useSalesStore } from '../../store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import { formatCurrency, cn } from '../../../../core/utils';
import { Wallet } from 'lucide-react';

interface InvoiceTotalsProps {
  notes: string;
  onNotesChange: (value: string) => void;
}

const InvoiceTotals: React.FC<InvoiceTotalsProps> = ({ notes, onNotesChange }) => {
  const { summary, currency } = useSalesStore();
  // [FIX] استخدام hook بدلاً من getState() لضمان التحديث التفاعلي عند تغيير الإعدادات
  const { discountEnabled } = useDiscountStore();

  return (
    <div className="rounded-b-2xl border-t-2 border-gray-100 bg-[var(--app-surface)] p-2 dark:border-slate-800 max-md:p-2 md:p-3">
      <div className="flex items-stretch justify-between">
        <div className="flex-1 p-4 max-md:p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            ملاحظات الفاتورة
          </h4>
          <textarea
            value={notes}
            onChange={event => {
              onNotesChange(event.target.value);
            }}
            className="mt-2 h-full w-full resize-none bg-transparent text-xs font-bold outline-none"
          />
        </div>

        <div className="flex w-full flex-col border-l dark:border-slate-800 md:w-80">
          <div className={cn('grid', discountEnabled ? 'grid-cols-2' : 'grid-cols-1')}>
            <div className="border-b p-3 text-right dark:border-slate-800 max-md:p-3">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                المجموع الفرعي
              </span>
              <span
                dir="ltr"
                className="font-mono text-sm font-bold text-gray-700 dark:text-slate-300"
              >
                {formatCurrency(summary.subtotal, currency)}
              </span>
            </div>
            {discountEnabled && (
              <div className="border-b border-l p-3 text-right dark:border-slate-800 max-md:p-3">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  إجمالي الخصم
                </span>
                <span dir="ltr" className="font-mono text-sm font-bold text-rose-500">
                  {formatCurrency(summary.discountAmount, currency)}
                </span>
              </div>
            )}
          </div>

          <div className="group relative flex flex-1 items-center justify-between overflow-hidden bg-slate-950 p-4 text-white max-md:p-4">
            <div className="relative z-10">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                صافي الفاتورة
              </span>
              <h2
                dir="ltr"
                className="font-mono text-4xl font-bold leading-none tracking-tighter transition-transform duration-500 group-hover:scale-105 max-md:text-2xl"
              >
                {formatCurrency(summary.totalAmount, currency)}
              </h2>
            </div>
            <div className="relative z-10 rounded-none bg-blue-600 p-3 shadow-lg shadow-blue-500/40 max-md:p-3">
              <Wallet size={20} />
            </div>
            <div className="absolute left-0 top-0 h-0.5 w-full animate-pulse bg-blue-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTotals;
