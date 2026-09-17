import React from 'react';
import { ArrowLeftRight, Calendar, Hash, Eye, Printer } from 'lucide-react';
import { formatCurrency } from '../../core/utils';
import { cn } from '../../core/utils';

interface Props {
  data: {
    id: string;
    number: string;
    date: string;
    partyName: string;
    amount: number;
    status: string;
    type: 'sale_return' | 'purchase_return';
  };
  onView: (id: string) => void;
}

const MicroReturnCard: React.FC<Props> = ({ data, onView }) => {
  const isSale = data.type === 'sale_return';

  return (
    <div className="group relative overflow-hidden rounded-[1.8rem] border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm transition-all active:scale-[0.98]">
      {/* Decorative Side Bar */}
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-1.5',
          isSale ? 'bg-rose-500' : 'bg-orange-500'
        )}
      ></div>

      <div className="mb-2 flex items-start justify-between pr-2">
        <div className="flex flex-col">
          <div className="mb-0.5 flex items-center gap-1.5">
            <Hash size={10} className="text-gray-400" />
            <span
              dir="ltr"
              className="font-mono text-[11px] font-bold tracking-tighter text-blue-600 dark:text-blue-400"
            >
              {data.number}
            </span>
          </div>
          <h4 className="line-clamp-1 text-[12px] font-bold text-gray-800 dark:text-slate-100">
            {data.partyName}
          </h4>
        </div>
        <span
          className={cn(
            'rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest',
            data.status === 'posted'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
              : 'border-gray-100 bg-gray-50 text-gray-400'
          )}
        >
          {data.status === 'posted' ? 'مرحل' : 'مسودة'}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex flex-col">
          <span className="mb-1 text-[10px] font-semibold uppercase leading-none text-gray-400">
            قيمة المرتجع
          </span>
          <span
            dir="ltr"
            className={cn(
              'font-mono text-sm font-bold leading-none',
              isSale ? 'text-rose-600' : 'text-orange-600'
            )}
          >
            {isSale ? '-' : ''}
            {formatCurrency(data.amount)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onView(data.id);
            }}
            className="rounded-xl border border-gray-100 bg-white p-2 text-blue-600 shadow-sm transition-all active:scale-90 dark:border-slate-600 dark:bg-slate-700"
          >
            <Eye size={14} />
          </button>
          <button className="rounded-xl border border-gray-100 bg-white p-2 text-gray-400 shadow-sm transition-all active:scale-90 dark:border-slate-600 dark:bg-slate-700">
            <Printer size={14} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1 text-gray-400 dark:text-slate-500">
          <Calendar size={10} />
          <span dir="ltr" className="text-[10px] font-bold">
            {data.date}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowLeftRight size={10} className={isSale ? 'text-rose-400' : 'text-orange-400'} />
          <span className="text-[10px] font-semibold uppercase tracking-tighter text-gray-400">
            {isSale ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MicroReturnCard;
