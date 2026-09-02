import React from 'react';
import { Package } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import type { ReturnsType } from '../../hooks/useReturnsReport';

interface Props {
  topParties: TopPartyRow[];
  type: ReturnsType;
}

/** صف جهة (عميل/مورد) ضمن الأطراف الأكثر تفاعلاً في المرتجعات. */
interface TopPartyRow {
  name: string;
  count: number;
  total: number;
}

const ReturnsTopParties: React.FC<Props> = ({ topParties, type }) => {
  return (
    <div className="glass-panel bento-item group relative overflow-hidden border-none bg-white/40 p-10 shadow-2xl backdrop-blur-3xl dark:bg-slate-900/40">
      <div className="mb-8 flex items-center justify-between max-md:mb-3">
        <div>
          <h4 className="mb-1 text-xl font-black text-slate-800 dark:text-white">
            {type === 'sales'
              ? 'تحليل العملاء النشطين في المرتجعات'
              : type === 'purchase'
                ? 'تحليل الموردين النشطين في المرتجعات'
                : 'تحليل الأطراف الأكثر تفاعلاً'}
          </h4>
          <p className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            High-Impact Flow Entities Analysis
          </p>
        </div>
      </div>
      {topParties.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 max-md:gap-3 md:grid-cols-2 lg:grid-cols-1">
          {topParties.map((party, index) => (
            <div
              key={index}
              className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white/50 p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 dark:border-slate-700/50 dark:bg-slate-800/50 max-md:rounded-xl"
            >
              <div className="absolute inset-y-0 right-0 w-1 bg-blue-500 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100" />
              <div className="flex items-center gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-lg font-black italic text-blue-600 transition-transform group-hover:scale-110 dark:text-blue-400">
                  #{index + 1}
                </div>
                <div>
                  <span className="mb-1 block text-lg font-black tracking-tight text-slate-800 dark:text-white">
                    {party.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Returns Count:
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {party.count}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className="font-mono text-2xl font-black tracking-tighter text-slate-800 dark:text-white">
                  {formatCurrency(party.total)}
                </div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-500 opacity-60">
                  Aggregate Return Value
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-800/30 max-md:rounded-xl">
          <Package size={48} className="mx-auto mb-4 text-slate-300 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            No Significant Flow Detected in Current Context
          </p>
        </div>
      )}
    </div>
  );
};

export default ReturnsTopParties;
