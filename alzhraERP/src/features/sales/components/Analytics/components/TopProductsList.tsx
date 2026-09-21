/* eslint-disable max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/restrict-template-expressions */
import React from 'react';
import { Package, Crown, TrendingUp } from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';

interface TopProduct {
  productId: string;
  productName: string;
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Package size={16} />
          </div>
          <h4 className="text-base font-black tracking-tight text-slate-800 dark:text-white">
            {t.top_products}
          </h4>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
          <TrendingUp size={13} />
          <span>الأعلى إيراداً</span>
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">تحليل مساهمة الأصناف المتصدرة في المبيعات</p>

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
        ) : topProducts.length > 0 ? (
          topProducts.slice(0, 5).map((product, index) => {
            const rank = getRankBadge(index);
            const sharePercent =
              totalSales > 0 ? Math.min(100, Math.round((product.revenue / totalSales) * 100)) : 0;

            return (
              <div
                key={product.productId || `prod-${index}`}
                className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${rank.style}`}
                    >
                      {rank.icon ? <rank.icon size={13} /> : rank.label}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-800 dark:text-slate-200">
                        {product.productName}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                        {formatNumber(product.quantity)} قطعة مباعة
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-xs font-black text-slate-900 dark:text-white">
                      {formatCurrency(product.revenue)}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {sharePercent}% من المبيعات
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
