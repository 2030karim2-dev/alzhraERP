/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/restrict-template-expressions, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition */
import React, { useState, useMemo } from 'react';
import { Package, Crown, TrendingUp, Zap } from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';

interface TopProduct {
  productId: string;
  productName: string;
  partNumber?: string | null;
  brand?: string | null;
  sku?: string;
  currentStock?: number;
  quantity: number;
  revenue: number;
}

interface TopProductsListProps {
  topProducts: TopProduct[];
  totalSales: number;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export const TopProductsList: React.FC<TopProductsListProps> = ({
  topProducts,
  totalSales,
  isLoading,
  formatCurrency,
  formatNumber,
}) => {
  const { dictionary: t } = useI18nStore();
  const [sortMode, setSortMode] = useState<'revenue' | 'quantity'>('revenue');

  const sortedProducts = useMemo(() => {
    const list = [...topProducts];
    if (sortMode === 'quantity') {
      list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    } else {
      list.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    }
    return list;
  }, [topProducts, sortMode]);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return {
          label: '#1',
          icon: Crown,
          style:
            'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-900 shadow-sm shadow-amber-500/30',
        };
      case 1:
        return {
          label: '#2',
          style: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black',
        };
      case 2:
        return {
          label: '#3',
          style: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black',
        };
      default:
        return {
          label: `#${index + 1}`,
          style: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold',
        };
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Package size={16} />
          </div>
          <h4 className="text-base font-black tracking-tight text-slate-800 dark:text-white">
            {t.top_products}
          </h4>
        </div>

        {/* Sort Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950/60">
          <button
            onClick={() => setSortMode('revenue')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
              sortMode === 'revenue'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <TrendingUp size={12} />
            <span>الأعلى إيراداً</span>
          </button>
          <button
            onClick={() => setSortMode('quantity')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
              sortMode === 'quantity'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Zap size={12} />
            <span>الأسرع حركة</span>
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">
        تحليل مساهمة أصناف وقطع الغيار المتصدرة في المبيعات بعد خصم المرتجعات
      </p>

      <div className="mt-4 space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50"
              />
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          sortedProducts.slice(0, 5).map((product, index) => {
            const rank = getRankBadge(index);
            const sharePercent =
              totalSales > 0 ? Math.min(100, Math.round((product.revenue / totalSales) * 100)) : 0;
            const stock = product.currentStock ?? 0;
            const isOutOfStock = stock <= 0;

            return (
              <div
                key={product.productId || `prod-${index}`}
                className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${rank.style}`}
                    >
                      {rank.icon ? <rank.icon size={13} /> : rank.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-slate-800 dark:text-slate-200">
                        {product.productName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {product.partNumber && (
                          <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {product.partNumber}
                          </span>
                        )}
                        {product.brand && (
                          <span className="rounded bg-blue-100/80 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {product.brand}
                          </span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          {isOutOfStock ? 'نفد' : `متوفر: ${stock}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs font-black text-slate-900 dark:text-white">
                      {sortMode === 'quantity'
                        ? `${formatNumber(product.quantity)} قطعة`
                        : formatCurrency(product.revenue)}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {sortMode === 'quantity'
                        ? formatCurrency(product.revenue)
                        : `${sharePercent}% من المبيعات`}
                    </p>
                  </div>
                </div>

                {/* Pareto Contribution Progress Bar */}
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-700/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${sharePercent}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center">
            <Package size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-xs text-slate-400">{t.no_data_available || 'لا توجد بيانات'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopProductsList;
