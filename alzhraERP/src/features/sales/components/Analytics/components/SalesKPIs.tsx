/* eslint-disable max-lines-per-function, complexity, @typescript-eslint/restrict-template-expressions, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Package,
  CreditCard,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';

interface GrowthBadgeProps {
  value: number | null;
  inverted?: boolean;
}

const GrowthBadge: React.FC<GrowthBadgeProps> = ({ value, inverted = false }) => {
  if (value === null) {
    return null;
  }

  const isPositive = value >= 0;
  // If inverted (like returns), growth is red, decline is green
  const isGood = inverted ? !isPositive : isPositive;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const color = isGood
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
  const sign = isPositive ? '+' : '';

  return (
    <span
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-black tracking-tight ${color}`}
    >
      <Icon size={12} />
      {sign}
      {value.toFixed(1)}%
    </span>
  );
};

interface SalesKPIsProps {
  totalSales: number;
  netSales: number;
  invoiceCount: number;
  averageInvoiceValue: number;
  totalReturns: number;
  topCustomer: { customerName: string; totalAmount: number } | undefined;
  topProduct: { productName: string; quantity: number } | undefined;
  cashRatio: number;
  cashAmount: number;
  salesGrowth: number | null;
  returnsGrowth: number | null;
  periodLabel: string;
  isLoading: boolean;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export const SalesKPIs: React.FC<SalesKPIsProps> = ({
  totalSales,
  netSales,
  invoiceCount,
  averageInvoiceValue,
  totalReturns,
  topCustomer,
  topProduct,
  cashRatio,
  cashAmount,
  salesGrowth,
  returnsGrowth,
  periodLabel,
  isLoading,
  formatCurrency,
  formatNumber,
}) => {
  const { dictionary: t } = useI18nStore();

  const returnRate = totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Primary KPI Row (The Command Strip) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Gross Sales Card */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-5 text-white shadow-xl shadow-blue-500/15 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25">
          {/* Tech Mesh Glow */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-indigo-900/40 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
                <DollarSign size={22} className="text-white" />
              </div>
              <GrowthBadge value={salesGrowth} />
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-100">
              {t.total_sales_amount}
            </p>
            <p className="mt-1 font-mono text-2xl font-black tracking-tight sm:text-3xl">
              {isLoading ? '...' : formatCurrency(totalSales)}
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2 text-xs text-blue-100">
              <span>{periodLabel}</span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-cyan-200">
                <CheckCircle2 size={11} /> إجمالي الفواتير
              </span>
            </div>
          </div>
        </div>

        {/* Net Revenue Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp size={22} />
            </div>
            <GrowthBadge value={salesGrowth} />
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.net_sales}
          </p>
          <p className="mt-1 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {isLoading ? '...' : formatCurrency(netSales)}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>الصافي بعد حسم المردودات</span>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {totalSales > 0 ? `${((netSales / totalSales) * 100).toFixed(0)}%` : '100%'}
            </span>
          </div>
        </div>

        {/* Invoice Count & Velocity Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-105 dark:bg-purple-950/40 dark:text-purple-400">
              <Receipt size={22} />
            </div>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              {periodLabel}
            </span>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.invoices_count}
          </p>
          <p className="mt-1 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {isLoading ? '...' : formatNumber(invoiceCount)}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>متوسط الفاتورة:</span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {isLoading ? '...' : formatCurrency(averageInvoiceValue)}
            </span>
          </div>
        </div>

        {/* Average Basket Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-105 dark:bg-amber-950/40 dark:text-amber-400">
              <BarChart3 size={22} />
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Percent size={13} />
              <span>معدل الصفقات</span>
            </div>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.average_invoice}
          </p>
          <p className="mt-1 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {isLoading ? '...' : formatCurrency(averageInvoiceValue)}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>القوة الشرائية للسلة</span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              قيمة معيارية
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Telemetry Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {/* Returns & Health Score */}
        <div className="relative rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-rose-100/30 p-4 transition-all dark:border-rose-900/40 dark:from-rose-950/30 dark:to-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/50">
                <ArrowDownRight size={15} className="text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                {t.returns}
              </span>
            </div>
            <GrowthBadge value={returnsGrowth} inverted />
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <p className="font-mono text-lg font-black text-rose-700 dark:text-rose-300">
              {isLoading ? '...' : formatCurrency(totalReturns)}
            </p>
            <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
              {returnRate.toFixed(1)}% من المبيعات
            </span>
          </div>

          {/* Micro Progress Track */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rose-200/60 dark:bg-rose-950/60">
            <div
              className="h-full rounded-full bg-rose-500 transition-all duration-500"
              style={{ width: `${Math.min(100, returnRate * 5)}%` }}
            />
          </div>
        </div>

        {/* Top Customer Spotlight */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <Users size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.top_customer}
            </span>
          </div>

          <p className="mt-2 truncate text-sm font-black text-slate-800 dark:text-white">
            {isLoading ? '...' : topCustomer?.customerName || '-'}
          </p>

          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>إجمالي المشتريات:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {isLoading ? '' : topCustomer ? formatCurrency(topCustomer.totalAmount) : '-'}
            </span>
          </div>
        </div>

        {/* Top Product Spotlight */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
              <Package size={15} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.top_product}
            </span>
          </div>

          <p className="mt-2 truncate text-sm font-black text-slate-800 dark:text-white">
            {isLoading ? '...' : topProduct?.productName || '-'}
          </p>

          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>الكمية المباعة:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? '' : topProduct ? `${formatNumber(topProduct.quantity)} قطعة` : '-'}
            </span>
          </div>
        </div>

        {/* Cash Liquidity Gauge */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/50">
                <CreditCard size={15} className="text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.cash_ratio}
              </span>
            </div>
            <span className="font-mono text-xs font-black text-purple-700 dark:text-purple-300">
              {isLoading ? '...' : `${cashRatio}%`}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
              {formatCurrency(cashAmount)} نقداً
            </p>
            <span className="text-[10px] text-slate-400">السيولة الفورية</span>
          </div>

          {/* Progress bar of Cash vs Credit */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, cashRatio))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesKPIs;
