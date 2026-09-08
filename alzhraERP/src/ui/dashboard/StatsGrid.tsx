import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../lib/hooks/useTranslation';
import {
  DollarSign,
  Receipt,
  TrendingDown,
  ShoppingCart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { ROUTES } from '../../core/routes/paths';
import { cn, formatCurrency } from '../../core/utils';

// Lightweight inline SVG sparkline for stat cards
const MiniSparkline: React.FC<{ data: number[]; color: string; className?: string }> = ({
  data,
  color,
  className,
}) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} fill="none">
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
};

// Helper to format values consistently in SAR
const formatDisplayValue = (val: string | number | undefined) => {
  if (val === undefined || val === null) return formatCurrency(0);
  if (typeof val === 'number') return formatCurrency(val);
  const clean = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return Number.isFinite(num) ? formatCurrency(num) : val;
};

interface StatItem {
  title: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  icon: React.ElementType;
  colorClass: string;
  gradientClass: string;
  path: string;
  subtitle?: string;
}

interface StatsGridProps {
  stats?: {
    sales?: number | string;
    purchases?: number | string;
    expenses?: number | string;
    debts?: number | string;
    supplierDebts?: number | string;
    invoices?: number | string;
    profit?: number | string;
    // Trend data
    salesTrend?: number;
    purchasesTrend?: number;
    expensesTrend?: number;
    debtsTrend?: number;
    profitTrend?: number;
  };
  /** Real series used to draw the mini sparklines (e.g. daily sales). */
  sparklineData?: number[];
  /** The selected human-readable period label (e.g. "هذا الشهر", "اليوم", "جميع الأوقات") */
  periodLabel?: string;
}

const StatsGrid: React.FC<StatsGridProps> = ({
  stats = {},
  sparklineData = [],
  periodLabel = 'هذا الشهر',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Calculate trend percentage
  const getTrend = (trend?: number) => {
    if (trend === undefined || trend === null) return null;
    return {
      value: Math.abs(trend),
      isPositive: trend >= 0,
    };
  };

  const statItems: StatItem[] = [
    {
      title: t('total_sales'),
      value: formatDisplayValue(stats?.sales ?? 0),
      icon: DollarSign,
      colorClass: 'text-emerald-600',
      gradientClass: 'from-emerald-500 to-emerald-600',
      path: ROUTES.DASHBOARD.SALES,
      subtitle: periodLabel,
    },
    {
      title: t('total_purchases') || 'المشتريات',
      value: formatDisplayValue(stats?.purchases ?? 0),
      icon: ShoppingCart,
      colorClass: 'text-violet-600',
      gradientClass: 'from-violet-500 to-violet-600',
      path: ROUTES.DASHBOARD.PURCHASES || ROUTES.DASHBOARD.ACCOUNTING,
      subtitle: periodLabel,
    },
    {
      title: t('total_expenses'),
      value: formatDisplayValue(stats?.expenses ?? 0),
      icon: Receipt,
      colorClass: 'text-rose-600',
      gradientClass: 'from-rose-500 to-rose-600',
      path: ROUTES.DASHBOARD.EXPENSES,
      subtitle: periodLabel,
    },
    {
      title: t('total_debts'),
      value: formatDisplayValue(stats?.debts ?? 0),
      icon: TrendingDown,
      colorClass: 'text-amber-600',
      gradientClass: 'from-amber-500 to-amber-600',
      path: ROUTES.DASHBOARD.DEBTS || ROUTES.DASHBOARD.ACCOUNTING,
      subtitle: 'ذمم العملاء — مستحق التحصيل',
    },
    ...(stats?.supplierDebts !== undefined && Number(stats.supplierDebts) > 0
      ? [
          {
            title: 'مستحقات الموردين',
            value: formatDisplayValue(stats.supplierDebts),
            icon: ShoppingCart,
            colorClass: 'text-orange-600',
            gradientClass: 'from-orange-500 to-orange-600',
            path: ROUTES.DASHBOARD.SUPPLIERS || ROUTES.DASHBOARD.ACCOUNTING,
            subtitle: 'ذمم الموردين — مستحقة السداد',
          },
        ]
      : []),
  ];

  // Add profit/loss if available
  if (stats?.profit !== undefined && stats?.profit !== null) {
    const isLoss = Number(stats.profit) < 0;
    statItems.splice(2, 0, {
      title: isLoss ? t('net_loss') || 'صافي الخسارة' : t('net_profit') || 'صافي الربح',
      value: formatDisplayValue(stats.profit),
      icon: isLoss ? TrendingDown : Wallet,
      colorClass: isLoss ? 'text-rose-600' : 'text-emerald-600',
      gradientClass: isLoss ? 'from-rose-500 to-rose-600' : 'from-emerald-500 to-emerald-600',
      path: ROUTES.DASHBOARD.REPORTS,
      subtitle: periodLabel,
    });
  }

  return (
    <section className="grid grid-cols-2 gap-4 max-md:gap-3 md:grid-cols-4 lg:grid-cols-5">
      {statItems.map(item => {
        const trendKey =
          item.title === t('total_sales')
            ? 'salesTrend'
            : item.title === (t('total_purchases') || 'المشتريات')
              ? 'purchasesTrend'
              : item.title === t('total_expenses')
                ? 'expensesTrend'
                : item.title === (t('net_profit') || 'صافي الربح') ||
                    item.title === (t('net_loss') || 'صافي الخسارة')
                  ? 'profitTrend'
                  : 'debtsTrend';

        const trend = getTrend(stats[trendKey as keyof typeof stats] as number);

        // Parse numeric value for counter
        // const _numericVal = parseFloat(item.value.replace(/[^0-9.-]/g, '')) || 0;
        const sparkColor = item.colorClass.replace('text-', '').includes('emerald')
          ? '#10b981'
          : item.colorClass.includes('violet')
            ? '#8b5cf6'
            : item.colorClass.includes('rose')
              ? '#f43f5e'
              : item.colorClass.includes('amber')
                ? '#f59e0b'
                : '#3b82f6';

        return (
          <div
            key={item.title}
            onClick={() => navigate(item.path)}
            className="group relative cursor-pointer"
          >
            {/* Ambient Glow */}
            <div
              className={cn(
                'absolute -inset-0.5 rounded-3xl opacity-0 blur-[12px] transition duration-300 group-hover:opacity-40 max-md:rounded-xl',
                item.gradientClass.replace('to-', 'from-')
              )}
            ></div>

            <div
              className={cn(
                'bg-[var(--app-surface)]/80 relative overflow-hidden rounded-3xl border border-[var(--app-border)] p-3 backdrop-blur-xl transition-all duration-300 max-md:rounded-xl max-md:p-2.5',
                'hover:border-[var(--accent)]/30 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
              )}
            >
              {/* Background Pattern */}
              <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay">
                <div
                  className={cn(
                    'absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[40px]',
                    item.colorClass.replace('text-', 'bg-')
                  )}
                ></div>
                <div
                  className={cn(
                    'absolute -bottom-10 -left-10 h-24 w-24 rounded-full blur-[30px]',
                    item.colorClass.replace('text-', 'bg-')
                  )}
                ></div>
              </div>

              <div className="relative z-10 flex h-full flex-col justify-between gap-4 max-md:gap-2">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase leading-none tracking-widest text-[var(--app-text-secondary)]">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      'rounded-2xl border border-white/5 p-2.5 shadow-inner backdrop-blur-md max-md:rounded-xl max-md:p-2',
                      item.gradientClass,
                      'bg-opacity-20'
                    )}
                  >
                    <item.icon
                      size={20}
                      className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] max-md:h-4 max-md:w-4"
                    />
                  </div>
                </div>

                {/* Value + Sparkline Row */}
                <div className="mt-2 flex items-end justify-between">
                  <h3
                    className={cn(
                      'shrink-0 whitespace-nowrap font-mono text-lg font-bold leading-none tracking-tighter drop-shadow-md md:text-xl',
                      item.title === (t('net_loss') || 'صافي الخسارة')
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[var(--app-text)]'
                    )}
                  >
                    {item.value}
                  </h3>
                  <MiniSparkline
                    data={sparklineData}
                    color={sparkColor}
                    className="hidden md:block"
                  />
                </div>

                {/* Trend Badge */}
                <div className="mt-2 flex items-center justify-between">
                  {trend ? (
                    <div
                      className={cn(
                        'flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md',
                        trend.isPositive
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                      )}
                    >
                      {trend.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      <span>{trend.value.toFixed(1)}%</span>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default StatsGrid;
