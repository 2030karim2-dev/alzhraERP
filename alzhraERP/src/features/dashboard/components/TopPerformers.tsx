/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type */
import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Box,
  Zap,
  TrendingUp,
  BadgePercent,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn, formatCurrency, formatNumberDisplay } from '../../../core/utils';
import FastMovingPartsModal from './FastMovingPartsModal';

export interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
  part_number?: string | null;
  brand?: string | null;
  sku?: string;
  category_name?: string | null;
  current_stock?: number;
  min_stock_level?: number;
  is_low_stock?: boolean;
  is_out_of_stock?: boolean;
  gross_profit?: number;
  price?: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  total: number;
  invoices: number;
}

interface TopPerformersProps {
  products?: TopProduct[];
  customers?: TopCustomer[];
  className?: string;
  periodLabel?: string;
}

type SortMode = 'quantity' | 'revenue' | 'profit';

// --- Sub-components (Atoms/Molecules) ---

const ProductItem = React.memo(
  ({
    product,
    index,
    maxVal,
    sortMode,
  }: {
    product: TopProduct;
    index: number;
    maxVal: number;
    sortMode: SortMode;
  }) => {
    const currentVal =
      sortMode === 'revenue'
        ? product.revenue || 0
        : sortMode === 'profit'
          ? product.gross_profit || 0
          : product.quantity || 0;

    const percentage = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;
    const stock = product.current_stock ?? 0;
    const isOut = product.is_out_of_stock || stock <= 0;
    const isLow = !isOut && (product.is_low_stock || stock <= (product.min_stock_level ?? 5));

    return (
      <div className="group/item relative flex items-center justify-between overflow-hidden rounded-2xl p-3 transition-all hover:bg-white/5 max-md:rounded-xl">
        {/* Progress Bar Background */}
        <div
          className="absolute bottom-0 right-0 top-0 bg-gradient-to-l from-amber-500/15 to-transparent transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />

        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black shadow-inner backdrop-blur-md',
              index === 0
                ? 'border-amber-500/40 bg-amber-500/20 text-amber-400'
                : index === 1
                  ? 'border-slate-400/20 bg-slate-700/50 text-slate-300'
                  : index === 2
                    ? 'border-orange-500/30 bg-orange-900/25 text-orange-400'
                    : 'border-white/10 bg-slate-800/40 text-slate-400'
            )}
          >
            {index + 1}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[var(--app-text)] transition-colors group-hover/item:text-amber-400">
              {product.name}
            </p>

            {/* Spec Badges: Part Number + Brand + Stock Status */}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {product.part_number && (
                <span className="rounded border border-amber-500/20 bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300/90">
                  {product.part_number}
                </span>
              )}
              {product.brand && (
                <span className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                  {product.brand}
                </span>
              )}

              {/* Stock Status Badge */}
              {isOut ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                  <XCircle size={10} />
                  <span>نفد</span>
                </span>
              ) : isLow ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                  <AlertTriangle size={10} />
                  <span>شحيح ({stock})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  <CheckCircle2 size={10} />
                  <span>متوفر ({stock})</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric Values */}
        <div className="relative z-10 mr-2 flex shrink-0 flex-col items-end text-left">
          {sortMode === 'quantity' ? (
            <>
              <span className="font-mono text-xs font-black text-amber-400">
                {formatNumberDisplay(product.quantity)}{' '}
                <span className="font-sans text-[10px]">مباعة</span>
              </span>
              <span className="mt-0.5 font-mono text-[10px] text-[var(--app-text-secondary)]">
                {formatCurrency(product.revenue)}
              </span>
            </>
          ) : sortMode === 'revenue' ? (
            <>
              <span className="font-mono text-xs font-black text-amber-400">
                {formatCurrency(product.revenue)}
              </span>
              <span className="mt-0.5 font-mono text-[10px] text-[var(--app-text-secondary)]">
                {formatNumberDisplay(product.quantity)} قطعة
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-xs font-black text-purple-400">
                {formatCurrency(product.gross_profit ?? 0)}
              </span>
              <span className="mt-0.5 font-mono text-[10px] text-[var(--app-text-secondary)]">
                إيراد: {formatCurrency(product.revenue)}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }
);

const CustomerItem = React.memo(
  ({ customer, index, maxTotal }: { customer: TopCustomer; index: number; maxTotal: number }) => {
    const percentage = maxTotal > 0 ? (customer.total / maxTotal) * 100 : 0;

    return (
      <div className="group/item relative flex items-center justify-between overflow-hidden rounded-2xl p-3 transition-all hover:bg-white/5 max-md:rounded-xl">
        {/* Progress Bar Background */}
        <div
          className="absolute bottom-0 right-0 top-0 bg-gradient-to-l from-blue-500/15 to-transparent transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />

        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black shadow-inner backdrop-blur-md',
              index === 0
                ? 'border-blue-500/40 bg-blue-500/20 text-blue-400'
                : index === 1
                  ? 'border-slate-400/20 bg-slate-700/50 text-slate-300'
                  : index === 2
                    ? 'border-indigo-500/30 bg-indigo-900/25 text-indigo-400'
                    : 'border-white/10 bg-slate-800/40 text-slate-400'
            )}
          >
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[var(--app-text)] transition-colors group-hover/item:text-blue-400">
              {customer.name}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-[var(--app-text-secondary)]">
              {customer.invoices} <span className="font-sans text-[10px]">فاتورة/طلبية</span>
            </p>
          </div>
        </div>

        <span className="relative z-10 mr-2 shrink-0 font-mono text-xs font-black text-blue-400 drop-shadow-md">
          {formatCurrency(customer.total)}
        </span>
      </div>
    );
  }
);

export const TopPerformers: React.FC<TopPerformersProps> = React.memo(
  ({ products = [], customers = [], className, periodLabel = 'الفترة المحددة' }) => {
    const [sortMode, setSortMode] = useState<SortMode>('quantity');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const hasProducts = products && products.length > 0;
    const hasCustomers = customers && customers.length > 0;

    // Dynamically sorted product list
    const sortedProducts = useMemo(() => {
      const list = [...products];
      if (sortMode === 'revenue') {
        list.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
      } else if (sortMode === 'profit') {
        list.sort((a, b) => (b.gross_profit || 0) - (a.gross_profit || 0));
      } else {
        list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      }
      return list;
    }, [products, sortMode]);

    const maxProductVal = useMemo(() => {
      if (!hasProducts) return 0;
      if (sortMode === 'revenue') {
        return Math.max(...products.map(p => p.revenue || 0));
      }
      if (sortMode === 'profit') {
        return Math.max(...products.map(p => p.gross_profit || 0));
      }
      return Math.max(...products.map(p => p.quantity || 0));
    }, [products, hasProducts, sortMode]);

    const maxCustomerTotal = useMemo(
      () => (hasCustomers ? Math.max(...customers.map(c => c.total)) : 0),
      [customers, hasCustomers]
    );

    return (
      <>
        <div className={cn('grid grid-cols-1 gap-6 max-md:gap-3 md:grid-cols-2', className)}>
          {/* Top Auto Parts */}
          <div className="bg-[var(--app-surface)]/80 group relative overflow-hidden rounded-3xl border border-[var(--app-border)] p-5 backdrop-blur-xl transition-all duration-500 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-md:rounded-xl max-md:p-3">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-500/10 blur-[60px] transition-all duration-700 group-hover:bg-amber-400/20" />

            {/* Section Header */}
            <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-2 max-md:mb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/20 to-orange-600/20 p-2 shadow-inner">
                  <Box
                    size={18}
                    className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-[var(--app-text)]">
                    قطع الغيار الأسرع حركة
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--app-text-secondary)]">
                    القطع الأكثر مبيعاً وإيراداً ({periodLabel})
                  </p>
                </div>
              </div>

              {/* View Full Analysis Modal Button */}
              {hasProducts && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400 transition-all hover:bg-amber-500 hover:text-slate-950"
                  title="عرض الكشف الشامل والتفاصيل"
                >
                  <Maximize2 size={12} />
                  <span className="hidden sm:inline">الكشف الشامل</span>
                </button>
              )}
            </div>

            {/* Sort Switcher Bar */}
            <div className="relative z-10 mb-3 flex items-center gap-1 rounded-xl border border-[var(--app-border)] bg-black/20 p-1">
              <button
                onClick={() => setSortMode('quantity')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-bold transition-all',
                  sortMode === 'quantity'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-[var(--app-text-secondary)] hover:text-white'
                )}
              >
                <Zap size={11} />
                <span>الأسرع حركة</span>
              </button>

              <button
                onClick={() => setSortMode('revenue')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-bold transition-all',
                  sortMode === 'revenue'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-[var(--app-text-secondary)] hover:text-white'
                )}
              >
                <TrendingUp size={11} />
                <span>الأكثر إيراداً</span>
              </button>

              <button
                onClick={() => setSortMode('profit')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-bold transition-all',
                  sortMode === 'profit'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-[var(--app-text-secondary)] hover:text-white'
                )}
              >
                <BadgePercent size={11} />
                <span>الأعلى ربحاً</span>
              </button>
            </div>

            {/* Products List (Top 5 visible, rest accessible via modal) */}
            <div className="relative z-10 space-y-2">
              {hasProducts ? (
                sortedProducts
                  .slice(0, 5)
                  .map((product, index) => (
                    <ProductItem
                      key={product.id}
                      product={product}
                      index={index}
                      maxVal={maxProductVal}
                      sortMode={sortMode}
                    />
                  ))
              ) : (
                <div className="py-8 text-center max-md:py-4">
                  <Box size={32} className="mx-auto mb-3 text-[var(--app-text-secondary)]" />
                  <p className="text-xs font-bold text-[var(--app-text-secondary)]">
                    لا توجد حركات بيع لقطع الغيار في {periodLabel}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top Customers (Workshops/Individuals) */}
          <div className="bg-[var(--app-surface)]/80 group relative overflow-hidden rounded-3xl border border-[var(--app-border)] p-5 backdrop-blur-xl transition-all duration-500 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-md:rounded-xl max-md:p-3">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-[60px] transition-all duration-700 group-hover:bg-blue-400/20" />

            <div className="relative z-10 mb-6 flex items-center gap-3 max-md:mb-3">
              <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 p-2.5 shadow-inner">
                <Wrench
                  size={18}
                  className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide text-[var(--app-text)]">
                  أفضل العملاء والورش
                </h3>
                <p className="text-[10px] font-bold text-[var(--app-text-secondary)]">
                  العملاء ذوي المسحوبات الأعلى ({periodLabel})
                </p>
              </div>
            </div>

            <div className="relative z-10 space-y-3">
              {hasCustomers ? (
                customers
                  .slice(0, 5)
                  .map((customer, index) => (
                    <CustomerItem
                      key={customer.id}
                      customer={customer}
                      index={index}
                      maxTotal={maxCustomerTotal}
                    />
                  ))
              ) : (
                <div className="py-8 text-center max-md:py-4">
                  <Wrench size={32} className="mx-auto mb-3 text-[var(--app-text-secondary)]" />
                  <p className="text-xs font-bold text-[var(--app-text-secondary)]">
                    لا توجد بيانات مسحوبات عملاء في {periodLabel}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Deep Analysis Modal */}
        <FastMovingPartsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          products={products}
          periodLabel={periodLabel}
        />
      </>
    );
  }
);

export default TopPerformers;
