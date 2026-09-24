/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/restrict-template-expressions */
import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { cn, formatCurrency, formatNumberDisplay } from '@/core/utils';
import type { TopProduct } from '../TopPerformers';
import type { DisplayCurrency, ProductValues, SortField } from './types';

interface FastMovingTableRowProps {
  product: TopProduct;
  idx: number;
  vals: ProductValues;
  selectedCurrency: DisplayCurrency;
  sortField: SortField;
  maxVal: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const FastMovingTableRow: React.FC<FastMovingTableRowProps> = ({
  product: p,
  idx,
  vals,
  selectedCurrency,
  sortField,
  maxVal,
  isExpanded,
  onToggleExpand,
}) => {
  const stock = p.current_stock ?? 0;
  const isNegative = stock < 0;
  const isOut = p.is_out_of_stock || stock <= 0;
  const isLow = !isOut && (p.is_low_stock || stock <= (p.min_stock_level ?? 5));

  const currentVal =
    sortField === 'revenue' ? vals.rev : sortField === 'profit' ? vals.profit : p.quantity || 0;
  const pct = Math.min(100, Math.round((currentVal / maxVal) * 100));

  return (
    <>
      <tr
        onClick={onToggleExpand}
        className={cn(
          'group cursor-pointer border-b border-slate-800 transition-colors',
          isExpanded ? 'bg-slate-800/70' : 'hover:bg-slate-800/40'
        )}
      >
        {/* Rank */}
        <td className="border-l border-slate-700/70 px-3 py-3 text-center">
          <span
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[10px] font-black',
              idx === 0
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/40'
                : idx === 1
                  ? 'bg-slate-300 text-slate-950'
                  : idx === 2
                    ? 'bg-amber-700 text-white'
                    : 'border border-slate-800 bg-slate-800 text-slate-400'
            )}
          >
            {idx + 1}
          </span>
        </td>

        {/* Part Info */}
        <td className="border-l border-slate-700/70 px-3 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-100 transition-colors group-hover:text-amber-400">
              {p.name}
            </span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {p.part_number && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                  OEM: {p.part_number}
                </span>
              )}
              {p.brand && (
                <span className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                  {p.brand}
                </span>
              )}
              {p.category_name && (
                <span className="rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {p.category_name}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Current Stock */}
        <td className="border-l border-slate-700/70 px-3 py-3 text-center">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'font-mono text-xs font-bold',
                isNegative
                  ? 'text-rose-500'
                  : isOut
                    ? 'text-rose-400'
                    : isLow
                      ? 'text-amber-400'
                      : 'text-emerald-400'
              )}
            >
              {formatNumberDisplay(stock)}
            </span>
            <span className="text-[10px] text-slate-400">قطعة بالمستودع</span>
          </div>
        </td>

        {/* Net Quantity Sold + Progress Bar */}
        <td className="border-l border-slate-700/70 px-3 py-3 text-center">
          <div className="flex flex-col items-center">
            <span className="font-mono text-xs font-bold text-white">
              {formatNumberDisplay(p.quantity)}
            </span>
            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </td>

        {/* Revenue */}
        <td className="border-l border-slate-700/70 px-3 py-3 text-left font-mono font-bold text-blue-400">
          {formatCurrency(vals.rev, selectedCurrency)}
        </td>

        {/* Deducted Cost */}
        <td className="border-l border-slate-700/70 px-3 py-3 text-left font-mono font-bold text-rose-400">
          {formatCurrency(vals.cost, selectedCurrency)}
        </td>

        {/* Gross Profit */}
        <td className="border-l border-slate-700/70 px-3 py-3 text-left font-mono font-bold text-purple-400">
          {formatCurrency(vals.profit, selectedCurrency)}
        </td>

        {/* Margin % */}
        <td className="border-l border-slate-700/70 px-3 py-3 text-center">
          <span
            className={cn(
              'rounded px-2 py-0.5 font-mono text-[11px] font-black',
              vals.margin >= 30
                ? 'bg-emerald-500/15 text-emerald-400'
                : vals.margin >= 15
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-rose-500/15 text-rose-400'
            )}
          >
            %{vals.margin}
          </span>
        </td>

        {/* Stock Status Badge */}
        <td className="border-l border-slate-700/70 px-3 py-3 text-center">
          {isNegative ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-400">
              <ShieldAlert size={10} />
              <span>بيع مكشوف ({stock})</span>
            </span>
          ) : isOut ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
              <XCircle size={10} />
              <span>نفد من المخزن</span>
            </span>
          ) : isLow ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              <AlertTriangle size={10} />
              <span>شحيح (طلب عاجل)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 size={10} />
              <span>متوفر بالمخزن</span>
            </span>
          )}
        </td>

        {/* Expand Trigger Icon */}
        <td className="px-2 py-3 text-center text-slate-400">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>

      {/* Expandable Inspection Drawer */}
      {isExpanded && (
        <tr className="border-b-2 border-amber-500/40 bg-slate-950/90 text-xs">
          <td colSpan={10} className="p-4">
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:grid-cols-4">
              {/* Col 1: Piece Identity */}
              <div className="space-y-2 border-b border-slate-800 pb-3 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-4">
                <h5 className="text-[11px] font-bold text-amber-400">هوية ومواصفات القطعة</h5>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">اسم الصنف:</span>
                    <span className="font-bold text-white">{p.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">رقم القطعة OEM:</span>
                    <span className="font-mono text-amber-300">{p.part_number ?? 'غير مسجل'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">الماركة:</span>
                    <span className="text-blue-300">{p.brand ?? 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">الباركود/رمز الصنف:</span>
                    <span className="font-mono">{p.sku || 'لا يوجد'}</span>
                  </div>
                </div>
              </div>

              {/* Col 2: Price & Cost Structure */}
              <div className="space-y-2 border-b border-slate-800 pb-3 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-4">
                <h5 className="text-[11px] font-bold text-blue-400">
                  هيكل السعر والتكلفة المحاسبية
                </h5>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">متوسط سعر البيع للوحدة:</span>
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(p.quantity > 0 ? vals.rev / p.quantity : 0, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">متوسط التكلفة المحسومة للوحدة:</span>
                    <span className="font-mono font-bold text-rose-300">
                      {formatCurrency(
                        p.quantity > 0 ? vals.cost / p.quantity : 0,
                        selectedCurrency
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">الربح للقطعة الواحدة:</span>
                    <span className="font-mono font-bold text-purple-300">
                      {formatCurrency(
                        p.quantity > 0 ? vals.profit / p.quantity : 0,
                        selectedCurrency
                      )}
                    </span>
                  </div>
                  {isNegative && (
                    <p className="mt-1 text-[10px] text-amber-400">
                      * تم تطبيق التكلفة التقديرية (70%) لتفادي تضخيم الأرباح قبل إدخال فاتورة
                      الشراء.
                    </p>
                  )}
                </div>
              </div>

              {/* Col 3: Totals & Margins */}
              <div className="space-y-2 border-b border-slate-800 pb-3 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-4">
                <h5 className="text-[11px] font-bold text-purple-400">المجاميع ونسبة هامش الربح</h5>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">إجمالي المبيعات المحققة:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {formatCurrency(vals.rev, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">إجمالي تكلفة البضاعة:</span>
                    <span className="font-mono font-bold text-rose-400">
                      {formatCurrency(vals.cost, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">صافي مجمل الربح:</span>
                    <span className="font-mono font-bold text-purple-400">
                      {formatCurrency(vals.profit, selectedCurrency)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">الهامش:</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-purple-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, vals.margin))}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono font-bold text-purple-300">%{vals.margin}</span>
                  </div>
                </div>
              </div>

              {/* Col 4: Warehouse Advice */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-emerald-400">توصيات المخزون والطلب</h5>
                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">الرصيد الفعلي الحالي:</span>
                    <span
                      className={cn(
                        'font-mono font-bold',
                        isNegative ? 'text-rose-400' : 'text-emerald-400'
                      )}
                    >
                      {stock} قطعة
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">حد إعادة الطلب الأدنى:</span>
                    <span className="font-mono">{p.min_stock_level ?? 5} قطعة</span>
                  </div>
                  {isNegative ? (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[10px] text-rose-300">
                      ⚠️ المخزون بالسالب بمقدار ({Math.abs(stock)}) قطعة. يلزم إدخال فواتير الشراء
                      لضبط المخزن والتكلفة الدقيقة.
                    </div>
                  ) : isOut ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300">
                      ⚠️ القطعة نفدت تماماً ويوجد طلب عالي عليها ({p.quantity} مبيع). يُنصح بإنشاء
                      أمر شراء فوري.
                    </div>
                  ) : isLow ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300">
                      الرصيد شحيح ووصل لحد الطلب الأدنى.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[10px] text-emerald-300">
                      وضع المخزون صحي ومتوفر بالكمية المطلوبة.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
