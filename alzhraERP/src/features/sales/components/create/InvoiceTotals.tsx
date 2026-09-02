import React from 'react';
import { useSalesStore } from '../../store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import { formatCurrency, cn } from '../../../../core/utils';
import { Wallet } from 'lucide-react';

interface InvoiceTotalsProps {
  notes: string;
  onNotesChange: (value: string) => void;
}

const NotesSection: React.FC<{ notes: string; onNotesChange: (v: string) => void }> = ({
  notes,
  onNotesChange,
}) => (
  <div className="flex-1 p-2.5 sm:p-4">
    <label
      htmlFor="sales-invoice-notes"
      className="text-[10px] font-bold uppercase tracking-widest text-gray-400"
    >
      ملاحظات الفاتورة
    </label>
    <textarea
      id="sales-invoice-notes"
      value={notes}
      onChange={event => {
        onNotesChange(event.target.value);
      }}
      rows={2}
      placeholder="أدخل أي ملاحظات على الفاتورة..."
      className="mt-1.5 h-16 w-full resize-none rounded-lg border border-slate-200/50 bg-slate-50/50 p-2 text-xs font-bold outline-none focus:border-blue-500/50 dark:border-slate-800 dark:bg-slate-900/40 sm:h-20"
    />
  </div>
);

interface BreakdownProps {
  subtotal: number;
  discountAmount: number;
  currency: string;
  discountEnabled: boolean;
}

const TotalsBreakdown: React.FC<BreakdownProps> = ({
  subtotal,
  discountAmount,
  currency,
  discountEnabled,
}) => (
  <div className={cn('grid', discountEnabled ? 'grid-cols-2' : 'grid-cols-1')}>
    <div className="border-b p-2.5 text-right dark:border-slate-800 sm:p-3">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
        المجموع الفرعي
      </span>
      <span
        dir="ltr"
        className="font-mono text-xs font-bold text-gray-700 dark:text-slate-300 sm:text-sm"
      >
        {formatCurrency(subtotal, currency)}
      </span>
    </div>
    {discountEnabled && (
      <div className="border-b border-l p-2.5 text-right dark:border-slate-800 sm:p-3">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
          إجمالي الخصم
        </span>
        <span dir="ltr" className="font-mono text-xs font-bold text-rose-500 sm:text-sm">
          {formatCurrency(discountAmount, currency)}
        </span>
      </div>
    )}
  </div>
);

const NetTotalDisplay: React.FC<{ totalAmount: number; currency: string }> = ({
  totalAmount,
  currency,
}) => (
  <div className="group relative flex flex-1 items-center justify-between overflow-hidden bg-slate-950 p-3 text-white sm:p-4">
    <div className="relative z-10">
      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
        صافي الفاتورة
      </span>
      <h2
        dir="ltr"
        className="font-mono text-xl font-bold leading-none tracking-tighter transition-transform duration-500 group-hover:scale-105 sm:text-2xl lg:text-3xl"
      >
        {formatCurrency(totalAmount, currency)}
      </h2>
    </div>
    <div className="relative z-10 rounded-xl bg-blue-600 p-2.5 shadow-lg shadow-blue-500/40 sm:p-3">
      <Wallet size={18} className="sm:h-5 sm:w-5" />
    </div>
    <div className="absolute left-0 top-0 h-0.5 w-full animate-pulse bg-blue-500"></div>
  </div>
);

const InvoiceTotals: React.FC<InvoiceTotalsProps> = ({ notes, onNotesChange }) => {
  const { summary, currency } = useSalesStore();
  const { discountEnabled } = useDiscountStore();

  return (
    <div className="rounded-b-2xl border-t-2 border-gray-100 bg-[var(--app-surface)] dark:border-slate-800">
      <div className="flex flex-col items-stretch justify-between md:flex-row">
        <NotesSection notes={notes} onNotesChange={onNotesChange} />

        <div className="flex w-full flex-col border-t border-slate-200 dark:border-slate-800 md:w-80 md:border-l md:border-t-0">
          <TotalsBreakdown
            subtotal={summary.subtotal}
            discountAmount={summary.discountAmount}
            currency={currency}
            discountEnabled={discountEnabled}
          />
          <NetTotalDisplay totalAmount={summary.totalAmount} currency={currency} />
        </div>
      </div>
    </div>
  );
};

export default InvoiceTotals;
