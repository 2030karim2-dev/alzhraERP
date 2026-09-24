/* eslint-disable max-lines-per-function */
import React from 'react';
import { Info } from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '@/core/utils';
import type { DisplayCurrency, FastMovingSummary } from './types';

interface FastMovingKpisProps {
  productsCount: number;
  summary: FastMovingSummary;
  selectedCurrency: DisplayCurrency;
}

export const FastMovingKpis: React.FC<FastMovingKpisProps> = ({
  productsCount,
  summary,
  selectedCurrency,
}) => {
  return (
    <>
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-2 border-b border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-6 sm:gap-3">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
          <span className="text-[10px] font-bold text-slate-400">عدد القطع المتصدرة</span>
          <p className="font-mono text-sm font-black text-amber-400 sm:text-base">
            {formatNumberDisplay(productsCount)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
          <span className="text-[10px] font-bold text-slate-400">صافي المباع</span>
          <p className="font-mono text-sm font-black text-emerald-400 sm:text-base">
            {formatNumberDisplay(summary.totalQty)}{' '}
            <span className="font-sans text-[10px]">قطعة</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
          <span className="text-[10px] font-bold text-slate-400">إجمالي الإيراد</span>
          <p className="font-mono text-sm font-black text-blue-400 sm:text-base">
            {formatCurrency(summary.totalRev, selectedCurrency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
          <span className="text-[10px] font-bold text-slate-400">إجمالي التكلفة الفعلية</span>
          <p className="font-mono text-sm font-black text-rose-400 sm:text-base">
            {formatCurrency(summary.totalCost, selectedCurrency)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">مجمل الربح المحقق</span>
            <span className="rounded bg-purple-500/20 px-1 py-0.5 text-[10px] font-bold text-purple-300">
              %{summary.avgMargin}
            </span>
          </div>
          <p className="font-mono text-sm font-black text-purple-400 sm:text-base">
            {formatCurrency(summary.totalProfit, selectedCurrency)}
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-400">مخاطر المخزون</span>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {summary.negativeStockCount > 0 && (
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                {summary.negativeStockCount} سالب
              </span>
            )}
            <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
              {summary.outOfStockCount} نفد
            </span>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              {summary.lowStockCount} شحيح
            </span>
          </div>
        </div>
      </div>

      {/* Info Banner on Cost Accuracy */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 bg-amber-500/5 px-4 py-2 text-[11px] text-amber-300/90">
        <Info size={14} className="shrink-0 text-amber-400" />
        <span>
          <strong>معايير الحساب الدقيق:</strong> تم تحويل المبيعات والتكاليف إلى نفس العملة المحددة.
          تم خصم تكلفة البضاعة المباعة تلقائياً، والمنتجات المباعة بالسالب (قبل توريدها) تم احتساب
          تكلفة تقديرية لها بنسبة 70% لمنع إظهار أرباح وهمية.
        </span>
      </div>
    </>
  );
};
