
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { DollarSign, Receipt, TrendingDown, ShoppingCart, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ROUTES } from '../../core/routes/paths';
import { cn } from '../../core/utils';

// Animated counter hook
// const useCountUp = (end: number, duration: number = 1200) => {
//   const [count, setCount] = useState(0);
//   const prevEnd = useRef(0);
//   useEffect(() => {
//     if (end === prevEnd.current) return;
//     prevEnd.current = end;
//     const startTime = Date.now();
//     const animate = () => {
//       const elapsed = Date.now() - startTime;
//       const progress = Math.min(elapsed / duration, 1);
//       const eased = 1 - Math.pow(1 - progress, 3);
//       setCount(Math.round(end * eased));
//       if (progress < 1) requestAnimationFrame(animate);
//     };
//     requestAnimationFrame(animate);
//   }, [end, duration]);
//   return count;
// };

// Mini sparkline SVG component
const MiniSparkline: React.FC<{ color: string }> = ({ color }) => {
  // Generate random-ish but consistent sparkline points
  const points = [30, 45, 25, 60, 35, 55, 70];
  const w = 80, h = 28;
  const maxVal = Math.max(...points);
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - (p / maxVal) * h;
    return `${x},${y}`;
  }).join(' ');
  const fillCoords = `0,${h} ${coords} ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-40 group-hover:opacity-70 transition-opacity duration-500">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillCoords} fill={`url(#spark-${color})`} />
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

interface StatItem {
  title: string;
  value: string;
  previousValue?: number;
  currentValue?: number;
  icon: React.ElementType;
  colorClass: string;
  gradientClass: string;
  path: string;
  subtitle?: string;
}

interface StatsGridProps {
  stats: {
    sales: string;
    purchases?: string;
    expenses: string;
    debts: string;
    invoices?: string;
    profit?: string;
    // Trend data
    salesTrend?: number;
    purchasesTrend?: number;
    expensesTrend?: number;
    debtsTrend?: number;
    profitTrend?: number;
  };
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Calculate trend percentage
  const getTrend = (trend?: number) => {
    if (trend === undefined) return null;
    return {
      value: Math.abs(trend),
      isPositive: trend >= 0
    };
  };

  const statItems: StatItem[] = [
    {
      title: t('total_sales'),
      value: stats.sales,
      icon: DollarSign,
      colorClass: "text-emerald-600",
      gradientClass: "from-emerald-500 to-emerald-600",
      path: ROUTES.DASHBOARD.SALES,
      subtitle: 'هذا الشهر'
    },
    {
      title: t('total_purchases') || 'المشتريات',
      value: stats.purchases || '0',
      icon: ShoppingCart,
      colorClass: "text-violet-600",
      gradientClass: "from-violet-500 to-violet-600",
      path: ROUTES.DASHBOARD.PURCHASES || ROUTES.DASHBOARD.ACCOUNTING,
      subtitle: 'هذا الشهر'
    },
    {
      title: t('total_expenses'),
      value: stats.expenses,
      icon: Receipt,
      colorClass: "text-rose-600",
      gradientClass: "from-rose-500 to-rose-600",
      path: ROUTES.DASHBOARD.EXPENSES,
      subtitle: 'هذا الشهر'
    },
    {
      title: t('total_debts'),
      value: stats.debts,
      icon: TrendingDown,
      colorClass: "text-amber-600",
      gradientClass: "from-amber-500 to-amber-600",
      path: ROUTES.DASHBOARD.ACCOUNTING,
      subtitle: 'مستحق التحصيل'
    },
  ];

  // Add profit if available
  if (stats.profit) {
    statItems.splice(2, 0, {
      title: t('net_profit') || 'صافي الربح',
      value: stats.profit,
      icon: Wallet,
      colorClass: "text-blue-600",
      gradientClass: "from-blue-500 to-blue-600",
      path: ROUTES.DASHBOARD.REPORTS,
      subtitle: 'هذا الشهر'
    });
  }

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {statItems.map((item) => {
        const trendKey = item.title === t('total_sales') ? 'salesTrend' :
          item.title === (t('total_purchases') || 'المشتريات') ? 'purchasesTrend' :
            item.title === t('total_expenses') ? 'expensesTrend' :
              item.title === (t('net_profit') || 'صافي الربح') ? 'profitTrend' :
                'debtsTrend';

        const trend = getTrend(stats[trendKey as keyof typeof stats] as number);

        // Parse numeric value for counter
        // const _numericVal = parseFloat(item.value.replace(/[^0-9.-]/g, '')) || 0;
        const sparkColor = item.colorClass.replace('text-', '').includes('emerald') ? '#10b981'
          : item.colorClass.includes('violet') ? '#8b5cf6'
            : item.colorClass.includes('rose') ? '#f43f5e'
              : item.colorClass.includes('amber') ? '#f59e0b'
                : '#3b82f6';

        return (
          <div
            key={item.title}
            onClick={() => navigate(item.path)}
            className="cursor-pointer group relative"
          >
            {/* Ambient Glow */}
            <div className={cn(
              "absolute -inset-0.5 rounded-3xl blur-[12px] opacity-0 group-hover:opacity-40 transition duration-300",
              item.gradientClass.replace('to-', 'from-')
            )}></div>

            <div className={cn(
              "relative overflow-hidden bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] p-5 rounded-3xl transition-all duration-300",
              "hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-[var(--accent)]/30"
            )}>
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none">
                <div className={cn("absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[40px]", item.colorClass.replace('text-', 'bg-'))}></div>
                <div className={cn("absolute -left-10 -bottom-10 w-24 h-24 rounded-full blur-[30px]", item.colorClass.replace('text-', 'bg-'))}></div>
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest leading-none mb-1.5 flex items-center gap-2">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-[9px] font-bold text-[var(--app-text-secondary)]">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  <div className={cn(
                    "p-2.5 rounded-2xl shadow-inner border border-white/5 backdrop-blur-md",
                    item.gradientClass,
                    "bg-opacity-20"
                  )}>
                    <item.icon size={20} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  </div>
                </div>

                {/* Value + Sparkline Row */}
                <div className="flex items-end justify-between mt-2">
                  <h3 className="text-lg md:text-xl font-bold text-[var(--app-text)] font-mono tracking-tighter leading-none drop-shadow-md whitespace-nowrap shrink-0">
                    {item.value}
                  </h3>
                  <MiniSparkline color={sparkColor} />
                </div>

                {/* Trend Badge */}
                <div className="flex items-center justify-between mt-2">
                  {trend ? (
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-semibold border backdrop-blur-md",
                      trend.isPositive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {trend.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      <span>{trend.value.toFixed(1)}%</span>
                    </div>
                  ) : <div />}
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
