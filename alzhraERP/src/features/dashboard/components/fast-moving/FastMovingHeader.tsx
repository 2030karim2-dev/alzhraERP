/* eslint-disable max-lines-per-function, @typescript-eslint/no-confusing-void-expression */
import React from 'react';
import { Box, Coins, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/core/utils';
import type { DisplayCurrency } from './types';

interface FastMovingHeaderProps {
  periodLabel: string;
  selectedCurrency: DisplayCurrency;
  setSelectedCurrency: (currency: DisplayCurrency) => void;
  isMaximized: boolean;
  setIsMaximized: (fn: (prev: boolean) => boolean) => void;
  onClose: () => void;
}

export const FastMovingHeader: React.FC<FastMovingHeaderProps> = ({
  periodLabel,
  selectedCurrency,
  setSelectedCurrency,
  isMaximized,
  setIsMaximized,
  onClose,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-5 py-3.5 max-md:p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
          <Box size={20} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-white sm:text-base">
              تحليل قطع الغيار الأسرع حركة والأكثر ربحية
            </h3>
            <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {periodLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            بيانات دقيقة لمحاسبة المبيعات وتكلفة البضاعة المباعة وخصم تكلفة المبيعات السالبة
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Currency Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/70 p-1">
          <span className="flex items-center gap-1 px-2 text-[10px] font-bold text-slate-400">
            <Coins size={12} className="text-amber-400" />
            العملة:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCurrency('YER')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
              selectedCurrency === 'YER'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
            title="عرض المبالغ بالريال اليمني"
          >
            ﷼ يمني (ر.ي)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCurrency('SAR')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
              selectedCurrency === 'SAR'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
            title="عرض المبالغ بالريال السعودي"
          >
            ﷼ سعودي (ر.س)
          </button>
        </div>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          onClick={() => setIsMaximized(prev => !prev)}
          className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          title={isMaximized ? 'تصغير الحجم الطبيعي' : 'تكبير ملء الشاشة'}
        >
          {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          title="إغلاق"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
