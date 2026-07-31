
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
    <div className="bg-white dark:bg-slate-900 p-3 rounded-[1.8rem] border border-gray-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group">
      {/* Decorative Side Bar */}
      <div className={cn(
        "absolute top-0 right-0 w-1.5 h-full",
        isSale ? "bg-rose-500" : "bg-orange-500"
      )}></div>

      <div className="flex justify-between items-start mb-2 pr-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Hash size={10} className="text-gray-400" />
            <span dir="ltr" className="text-[11px] font-bold font-mono text-blue-600 dark:text-blue-400 tracking-tighter">
              {data.number}
            </span>
          </div>
          <h4 className="text-[12px] font-bold text-gray-800 dark:text-slate-100 line-clamp-1">{data.partyName}</h4>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded-lg text-[8px] font-semibold border uppercase tracking-widest",
          data.status === 'posted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100"
        )}>
          {data.status === 'posted' ? 'مرحل' : 'مسودة'}
        </span>
      </div>

      <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-gray-100 dark:border-slate-800">
        <div className="flex flex-col">
          <span className="text-[7px] font-semibold text-gray-400 uppercase leading-none mb-1">قيمة المرتجع</span>
          <span dir="ltr" className={cn(
            "text-sm font-bold font-mono leading-none",
            isSale ? "text-rose-600" : "text-orange-600"
          )}>
            {isSale ? '-' : ''}{formatCurrency(data.amount)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => onView(data.id)} className="p-2 bg-white dark:bg-slate-700 text-blue-600 rounded-xl shadow-sm active:scale-90 transition-all border border-gray-100 dark:border-slate-600">
            <Eye size={14} />
          </button>
          <button className="p-2 bg-white dark:bg-slate-700 text-gray-400 rounded-xl shadow-sm active:scale-90 transition-all border border-gray-100 dark:border-slate-600">
            <Printer size={14} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1 text-gray-400 dark:text-slate-500">
          <Calendar size={10} />
          <span dir="ltr" className="text-[9px] font-bold">{data.date}</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowLeftRight size={10} className={isSale ? "text-rose-400" : "text-orange-400"} />
          <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-tighter">
            {isSale ? "مرتجع مبيعات" : "مرتجع مشتريات"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MicroReturnCard;
