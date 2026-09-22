/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/restrict-template-expressions */
import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Box,
  Zap,
  TrendingUp,
  BadgePercent,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';
import { formatCurrency, formatNumberDisplay, cn } from '../../../core/utils';
import type { TopProduct } from './TopPerformers';

interface FastMovingPartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: TopProduct[];
  periodLabel?: string;
}

type SortMode = 'quantity' | 'revenue' | 'profit';
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export const FastMovingPartsModal: React.FC<FastMovingPartsModalProps> = ({
  isOpen,
  onClose,
  products,
  periodLabel = 'الفترة المحددة',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('quantity');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // 1. Search filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(p => {
        const name = (p.name || '').toLowerCase();
        const partNo = (p.part_number || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return (
          name.includes(query) ||
          partNo.includes(query) ||
          brand.includes(query) ||
          sku.includes(query)
        );
      });
    }

    // 2. Stock filter
    if (stockFilter === 'out_of_stock') {
      result = result.filter(p => p.is_out_of_stock || (p.current_stock ?? 0) <= 0);
    } else if (stockFilter === 'low_stock') {
      result = result.filter(
        p =>
          p.is_low_stock ||
          ((p.current_stock ?? 0) > 0 && (p.current_stock ?? 0) <= (p.min_stock_level ?? 5))
      );
    } else if (stockFilter === 'in_stock') {
      result = result.filter(p => (p.current_stock ?? 0) > 0 && !p.is_low_stock);
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortMode === 'revenue') {
        return (b.revenue || 0) - (a.revenue || 0);
      }
      if (sortMode === 'profit') {
        return (b.gross_profit || 0) - (a.gross_profit || 0);
      }
      // default: quantity
      return (b.quantity || 0) - (a.quantity || 0);
    });

    return result;
  }, [products, searchQuery, sortMode, stockFilter]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    const totalQty = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalRev = products.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalProfit = products.reduce((sum, p) => sum + (p.gross_profit || 0), 0);
    const outOfStockCount = products.filter(
      p => p.is_out_of_stock || (p.current_stock ?? 0) <= 0
    ).length;
    const lowStockCount = products.filter(
      p =>
        p.is_low_stock ||
        ((p.current_stock ?? 0) > 0 && (p.current_stock ?? 0) <= (p.min_stock_level ?? 5))
    ).length;

    return { totalQty, totalRev, totalProfit, outOfStockCount, lowStockCount };
  }, [products]);

  const maxVal = useMemo(() => {
    if (products.length === 0) return 1;
    if (sortMode === 'revenue') {
      return Math.max(...products.map(p => p.revenue || 0), 1);
    }
    if (sortMode === 'profit') {
      return Math.max(...products.map(p => p.gross_profit || 0), 1);
    }
    return Math.max(...products.map(p => p.quantity || 0), 1);
  }, [products, sortMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-5 py-4 max-md:p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
              <Box size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white sm:text-base">
                  تحليل قطع الغيار الأسرع حركة والأكثر مبيعاً
                </h3>
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {periodLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                بيانات تفصيلية دقيقة لحركة وتصريف قطع الغيار، وهوية الصنف، والرصيد الفعلي في
                المستودع
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-2 border-b border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-5 sm:gap-3">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <span className="text-[10px] font-bold text-slate-400">عدد القطع المتصدرة</span>
            <p className="font-mono text-sm font-black text-amber-400 sm:text-base">
              {formatNumberDisplay(products.length)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <span className="text-[10px] font-bold text-slate-400">صافي الكمية المباعة</span>
            <p className="font-mono text-sm font-black text-emerald-400 sm:text-base">
              {formatNumberDisplay(summary.totalQty)}{' '}
              <span className="font-sans text-[10px]">قطعة</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <span className="text-[10px] font-bold text-slate-400">إجمالي الإيراد</span>
            <p className="font-mono text-sm font-black text-blue-400 sm:text-base">
              {formatCurrency(summary.totalRev)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <span className="text-[10px] font-bold text-slate-400">مجمل الربح التقديري</span>
            <p className="font-mono text-sm font-black text-purple-400 sm:text-base">
              {formatCurrency(summary.totalProfit)}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400">حالة المخزون الخطر</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                {summary.outOfStockCount} نفد
              </span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                {summary.lowStockCount} شحيح
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Sort & Stock Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-900/50 p-3 sm:px-5">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-md:w-full">
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم القطعة، رقم القطعة (OEM)، أو الماركة..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-1.5 pl-3 pr-9 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
            />
          </div>

          {/* Sort Pills */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              onClick={() => setSortMode('quantity')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                sortMode === 'quantity'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Zap size={12} />
              <span>الأسرع حركة (بالكمية)</span>
            </button>

            <button
              onClick={() => setSortMode('revenue')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                sortMode === 'revenue'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <TrendingUp size={12} />
              <span>الأكثر إيراداً</span>
            </button>

            <button
              onClick={() => setSortMode('profit')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                sortMode === 'profit'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <BadgePercent size={12} />
              <span>الأعلى ربحية</span>
            </button>
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              onClick={() => setStockFilter('all')}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                stockFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              الكل ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              متوفر
            </button>
            <button
              onClick={() => setStockFilter('low_stock')}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                stockFilter === 'low_stock'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              شحيح ({summary.lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                stockFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              نفد ({summary.outOfStockCount})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {filteredAndSortedProducts.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <table className="w-full text-right">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-bold text-slate-400">
                  <tr>
                    <th className="w-12 px-3 py-2.5 text-center">#</th>
                    <th className="px-3 py-2.5">قطعة الغيار والمواصفات</th>
                    <th className="px-3 py-2.5 text-center">المخزون المتوفر</th>
                    <th className="px-3 py-2.5 text-center">صافي المباع</th>
                    <th className="px-3 py-2.5 text-left">إجمالي الإيراد</th>
                    <th className="px-3 py-2.5 text-left">مجمل الربح</th>
                    <th className="px-3 py-2.5 text-center">حالة الصنف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-xs">
                  {filteredAndSortedProducts.map((p, idx) => {
                    const currentVal =
                      sortMode === 'revenue'
                        ? p.revenue || 0
                        : sortMode === 'profit'
                          ? p.gross_profit || 0
                          : p.quantity || 0;
                    const pct = Math.min(100, Math.round((currentVal / maxVal) * 100));
                    const stock = p.current_stock ?? 0;
                    const isOut = p.is_out_of_stock || stock <= 0;
                    const isLow = !isOut && (p.is_low_stock || stock <= (p.min_stock_level ?? 5));

                    return (
                      <tr
                        key={p.id || `prod-${idx}`}
                        className="group transition-colors hover:bg-slate-800/40"
                      >
                        {/* Rank */}
                        <td className="px-3 py-3 text-center">
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
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-100 transition-colors group-hover:text-amber-400">
                              {p.name}
                            </span>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {p.part_number && (
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                                  {p.part_number}
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
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                'font-mono text-xs font-bold',
                                isOut
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
                        <td className="px-3 py-3 text-center">
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
                        <td className="px-3 py-3 text-left font-mono font-bold text-amber-400">
                          {formatCurrency(p.revenue)}
                        </td>

                        {/* Gross Profit */}
                        <td className="px-3 py-3 text-left font-mono font-bold text-purple-400">
                          {formatCurrency(p.gross_profit ?? 0)}
                        </td>

                        {/* Stock Status Badge */}
                        <td className="px-3 py-3 text-center">
                          {isOut ? (
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Layers size={36} className="mb-2 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">
                لا توجد قطع غيار مطابقة للبحث أو الفلترة
              </p>
              <p className="mt-1 text-xs text-slate-500">
                حاول تغيير خيارات البحث أو الفرز أو الفترة الزمنية المحددة
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-5 py-3">
          <span className="text-xs text-slate-400">
            يتم احتساب الكميات والإيرادات بعد خصم المرتجعات تلقائياً.
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default FastMovingPartsModal;
