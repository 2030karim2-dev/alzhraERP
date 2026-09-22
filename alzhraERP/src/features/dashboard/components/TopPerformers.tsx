/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-confusing-void-expression */
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
  Users,
  Columns,
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
  cost?: number;
  gross_profit?: number;
  margin_percentage?: number;
  revenue_yer?: number;
  cost_yer?: number;
  gross_profit_yer?: number;
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
type MainTab = 'both' | 'parts' | 'customers';

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
      <div className="group/item border-[var(--app-border)]/50 bg-[var(--app-surface)]/60 relative flex items-center justify-between overflow-hidden rounded-2xl border p-3.5 transition-all hover:border-amber-500/30 hover:bg-white/5 max-md:p-2.5">
        {/* Progress Bar Background */}
        <div
          className="absolute bottom-0 right-0 top-0 bg-gradient-to-l from-amber-500/15 via-amber-500/5 to-transparent transition-all duration-1000 ease-out"
          style={{ width: `${percentage.toString()}%` }}
        />

        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-black shadow-inner backdrop-blur-md sm:h-10 sm:w-10 sm:text-sm',
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
            <p className="truncate text-xs font-bold text-[var(--app-text)] transition-colors group-hover/item:text-amber-400 sm:text-sm">
              {product.name}
            </p>

            {/* Spec Badges: Part Number + Brand + Stock Status */}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {product.part_number && (
                <span className="rounded-md border border-amber-500/25 bg-slate-800/90 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                  OEM: {product.part_number}
                </span>
              )}
              {product.brand && (
                <span className="rounded-md border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  {product.brand}
                </span>
              )}

              {/* Stock Status Badge */}
              {isOut ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                  <XCircle size={11} />
                  <span>نفد من المخزن</span>
                </span>
              ) : isLow ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  <AlertTriangle size={11} />
                  <span>شحيح ({stock})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <CheckCircle2 size={11} />
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
              <span className="font-mono text-sm font-black text-amber-400 sm:text-base">
                {formatNumberDisplay(product.quantity)}{' '}
                <span className="font-sans text-xs font-bold text-amber-300/80">قطعة</span>
              </span>
              <span className="mt-0.5 font-mono text-xs text-[var(--app-text-secondary)]">
                {formatCurrency(product.revenue)}
              </span>
            </>
          ) : sortMode === 'revenue' ? (
            <>
              <span className="font-mono text-sm font-black text-amber-400 sm:text-base">
                {formatCurrency(product.revenue)}
              </span>
              <span className="mt-0.5 font-mono text-xs text-[var(--app-text-secondary)]">
                {formatNumberDisplay(product.quantity)} مباعة
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-sm font-black text-purple-400 sm:text-base">
                {formatCurrency(product.gross_profit ?? 0)}
                {product.margin_percentage !== undefined && (
                  <span className="mr-1.5 font-sans text-[10px] font-bold text-purple-300">
                    ({product.margin_percentage}%)
                  </span>
                )}
              </span>
              <span className="mt-0.5 font-mono text-xs text-[var(--app-text-secondary)]">
                إيراد: {formatCurrency(product.revenue)} • تكلفة:{' '}
                {formatCurrency(product.cost ?? 0)}
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
      <div className="group/item border-[var(--app-border)]/50 bg-[var(--app-surface)]/60 relative flex items-center justify-between overflow-hidden rounded-2xl border p-3.5 transition-all hover:border-blue-500/30 hover:bg-white/5 max-md:p-2.5">
        {/* Progress Bar Background */}
        <div
          className="absolute bottom-0 right-0 top-0 bg-gradient-to-l from-blue-500/15 via-blue-500/5 to-transparent transition-all duration-1000 ease-out"
          style={{ width: `${percentage.toString()}%` }}
        />

        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-black shadow-inner backdrop-blur-md sm:h-10 sm:w-10 sm:text-sm',
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
            <p className="truncate text-xs font-bold text-[var(--app-text)] transition-colors group-hover/item:text-blue-400 sm:text-sm">
              {customer.name}
            </p>
            <p className="mt-0.5 font-mono text-xs text-[var(--app-text-secondary)]">
              {customer.invoices} <span className="font-sans text-xs">فاتورة / طلبية</span>
            </p>
          </div>
        </div>

        <span className="relative z-10 mr-2 shrink-0 font-mono text-sm font-black text-blue-400 drop-shadow-md sm:text-base">
          {formatCurrency(customer.total)}
        </span>
      </div>
    );
  }
);

export const TopPerformers: React.FC<TopPerformersProps> = React.memo(
  ({ products = [], customers = [], className, periodLabel = 'الفترة المحددة' }) => {
    const [activeMainTab, setActiveMainTab] = useState<MainTab>('both');
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

    // Number of items to display: 8 if single tab active, 6 if both
    const partsLimit = activeMainTab === 'parts' ? 8 : 6;
    const customersLimit = activeMainTab === 'customers' ? 8 : 6;

    return (
      <div className={cn('space-y-4', className)}>
        {/* Primary Tab Navigation Bar */}
        <div className="bg-[var(--app-surface)]/90 relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] p-2.5 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setActiveMainTab('both');
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm',
                activeMainTab === 'both'
                  ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-[var(--app-text-secondary)] hover:bg-white/5 hover:text-white'
              )}
            >
              <Columns size={16} className="text-emerald-400" />
              <span>عرض مزدوج</span>
            </button>

            <button
              onClick={() => {
                setActiveMainTab('parts');
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm',
                activeMainTab === 'parts'
                  ? 'border border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-sm'
                  : 'text-[var(--app-text-secondary)] hover:bg-white/5 hover:text-white'
              )}
            >
              <Box size={16} className="text-amber-400" />
              <span>قطع الغيار الأكثر طلباً</span>
              {hasProducts && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                  {products.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveMainTab('customers');
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm',
                activeMainTab === 'customers'
                  ? 'border border-blue-500/40 bg-blue-500/20 text-blue-400 shadow-sm'
                  : 'text-[var(--app-text-secondary)] hover:bg-white/5 hover:text-white'
              )}
            >
              <Users size={16} className="text-blue-400" />
              <span>كبار العملاء</span>
              {hasCustomers && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-bold text-blue-300">
                  {customers.length}
                </span>
              )}
            </button>
          </div>

          {/* View Full Analysis Modal Button */}
          {hasProducts && (
            <button
              onClick={() => {
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-300 shadow-sm transition-all hover:bg-amber-500 hover:text-slate-950 sm:text-sm"
              title="عرض الكشف الشامل والتفاصيل"
            >
              <Maximize2 size={15} />
              <span>الكشف الشامل لقطع الغيار</span>
            </button>
          )}
        </div>

        {/* Content Grid */}
        <div
          className={cn(
            'grid gap-5',
            activeMainTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {/* Top Auto Parts Card */}
          {(activeMainTab === 'both' || activeMainTab === 'parts') && (
            <div className="bg-[var(--app-surface)]/80 group relative overflow-hidden rounded-3xl border border-[var(--app-border)] p-5 backdrop-blur-xl transition-all duration-500 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] sm:p-6">
              <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-500/10 blur-[60px] transition-all duration-700 group-hover:bg-amber-400/20" />

              {/* Card Header */}
              <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/20 to-orange-600/20 p-2.5 shadow-inner">
                    <Box
                      size={20}
                      className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wide text-[var(--app-text)] sm:text-base">
                      قطع الغيار الأسرع حركة
                    </h3>
                    <p className="text-xs font-bold text-[var(--app-text-secondary)]">
                      القطع الأكثر طلباً ومبيعاً ({periodLabel})
                    </p>
                  </div>
                </div>

                <span className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-1 text-xs font-bold text-amber-400">
                  عرض أعلى {Math.min(sortedProducts.length, partsLimit)} قطع
                </span>
              </div>

              {/* Large Sort Tabs Bar */}
              <div className="relative z-10 mb-4 flex items-center gap-1.5 rounded-2xl border border-[var(--app-border)] bg-black/25 p-1.5 shadow-inner">
                <button
                  onClick={() => {
                    setSortMode('quantity');
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:text-sm',
                    sortMode === 'quantity'
                      ? 'bg-amber-500 font-black text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-[var(--app-text-secondary)] hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Zap
                    size={15}
                    className={sortMode === 'quantity' ? 'text-slate-950' : 'text-amber-400'}
                  />
                  <span>الأسرع حركة (بالكمية)</span>
                </button>

                <button
                  onClick={() => {
                    setSortMode('revenue');
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:text-sm',
                    sortMode === 'revenue'
                      ? 'bg-amber-500 font-black text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-[var(--app-text-secondary)] hover:bg-white/5 hover:text-white'
                  )}
                >
                  <TrendingUp
                    size={15}
                    className={sortMode === 'revenue' ? 'text-slate-950' : 'text-amber-400'}
                  />
                  <span>الأكثر إيراداً (بالمبلغ)</span>
                </button>

                <button
                  onClick={() => {
                    setSortMode('profit');
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:text-sm',
                    sortMode === 'profit'
                      ? 'bg-amber-500 font-black text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-[var(--app-text-secondary)] hover:bg-white/5 hover:text-white'
                  )}
                >
                  <BadgePercent
                    size={15}
                    className={sortMode === 'profit' ? 'text-slate-950' : 'text-amber-400'}
                  />
                  <span>الأعلى ربحاً</span>
                </button>
              </div>

              {/* Products List */}
              <div
                className={cn(
                  'relative z-10 gap-2.5',
                  activeMainTab === 'parts'
                    ? 'grid grid-cols-1 md:grid-cols-2'
                    : 'flex flex-col space-y-2'
                )}
              >
                {hasProducts ? (
                  sortedProducts
                    .slice(0, partsLimit)
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
                  <div className="col-span-full py-10 text-center">
                    <Box size={36} className="mx-auto mb-3 text-[var(--app-text-secondary)]" />
                    <p className="text-sm font-bold text-[var(--app-text-secondary)]">
                      لا توجد حركات بيع لقطع الغيار في {periodLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Customers Card */}
          {(activeMainTab === 'both' || activeMainTab === 'customers') && (
            <div className="bg-[var(--app-surface)]/80 group relative overflow-hidden rounded-3xl border border-[var(--app-border)] p-5 backdrop-blur-xl transition-all duration-500 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] sm:p-6">
              <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-[60px] transition-all duration-700 group-hover:bg-blue-400/20" />

              {/* Card Header */}
              <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 p-2.5 shadow-inner">
                    <Wrench
                      size={20}
                      className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wide text-[var(--app-text)] sm:text-base">
                      أفضل العملاء والورش
                    </h3>
                    <p className="text-xs font-bold text-[var(--app-text-secondary)]">
                      العملاء الأكثر شراءً وسحباً ({periodLabel})
                    </p>
                  </div>
                </div>

                <span className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-1 text-xs font-bold text-blue-400">
                  عرض أعلى {Math.min(customers.length, customersLimit)} عملاء
                </span>
              </div>

              {/* List */}
              <div
                className={cn(
                  'relative z-10 gap-2.5',
                  activeMainTab === 'customers'
                    ? 'grid grid-cols-1 md:grid-cols-2'
                    : 'flex flex-col space-y-2'
                )}
              >
                {hasCustomers ? (
                  customers
                    .slice(0, customersLimit)
                    .map((customer, index) => (
                      <CustomerItem
                        key={customer.id}
                        customer={customer}
                        index={index}
                        maxTotal={maxCustomerTotal}
                      />
                    ))
                ) : (
                  <div className="col-span-full py-10 text-center">
                    <Users size={36} className="mx-auto mb-3 text-[var(--app-text-secondary)]" />
                    <p className="text-sm font-bold text-[var(--app-text-secondary)]">
                      لا توجد بيانات مسحوبات عملاء في {periodLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Deep Analysis Modal */}
        <FastMovingPartsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          products={products}
          periodLabel={periodLabel}
        />
      </div>
    );
  }
);

export default TopPerformers;
