/* eslint-disable max-lines-per-function, complexity, @typescript-eslint/explicit-function-return-type, @typescript-eslint/restrict-template-expressions, @typescript-eslint/strict-boolean-expressions */
import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  Bot,
  Activity,
  Award,
} from 'lucide-react';

interface SalesAIInsightsProps {
  totalSales: number;
  prevTotalSales: number;
  totalReturns: number;
  netSales: number;
  invoiceCount: number;
  salesByDay: Array<{ date: string; sales: number; returns?: number }>;
  topProducts: Array<{ productId: string; productName: string; quantity: number; revenue: number }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalAmount: number;
    invoiceCount?: number;
  }>;
  cashRatio: number;
  period: 'today' | 'week' | 'month' | 'quarter' | 'year';
  formatCurrency: (value: number) => string;
  isLoading: boolean;
}

export const SalesAIInsights: React.FC<SalesAIInsightsProps> = ({
  totalSales,
  prevTotalSales,
  totalReturns,
  invoiceCount,
  topProducts,
  topCustomers,
  cashRatio,
  period,
  formatCurrency,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-indigo-200/50 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-blue-50/50 p-5 dark:border-indigo-900/30 dark:from-slate-900/60 dark:via-indigo-950/20 dark:to-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-200 dark:bg-indigo-900/50" />
          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-indigo-200 dark:bg-indigo-900/50" />
            <div className="h-3 w-64 rounded bg-indigo-100 dark:bg-indigo-900/30" />
          </div>
        </div>
      </div>
    );
  }

  // 1. Calculations & Metrics
  const growthRate =
    prevTotalSales > 0
      ? ((totalSales - prevTotalSales) / prevTotalSales) * 100
      : totalSales > 0
        ? 100
        : 0;

  const returnRate = totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;
  const avgBasket = invoiceCount > 0 ? totalSales / invoiceCount : 0;

  // 2. Predictive Run-Rate Projection (حساب التوقع الاستقرائي التقديري)
  const now = new Date();
  let periodMultiplier = 1;
  let periodDaysRemaining = 0;

  if (period === 'month') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = Math.max(1, now.getDate());
    periodDaysRemaining = daysInMonth - currentDay;
    periodMultiplier = daysInMonth / currentDay;
  } else if (period === 'week') {
    const dow = ((now.getDay() + 6) % 7) + 1; // 1 to 7
    periodDaysRemaining = 7 - dow;
    periodMultiplier = 7 / dow;
  } else if (period === 'quarter') {
    periodMultiplier = 1.15;
  }

  const projectedPeriodTotal =
    period === 'today' || period === 'year'
      ? totalSales
      : Math.round(totalSales * (periodMultiplier > 1 ? periodMultiplier : 1));

  // 3. Concentration Analysis (تحليل تركز المبيعات)
  const topProductShare =
    totalSales > 0 && topProducts[0] ? Math.round((topProducts[0].revenue / totalSales) * 100) : 0;
  const topCustomerShare =
    totalSales > 0 && topCustomers[0]
      ? Math.round((topCustomers[0].totalAmount / totalSales) * 100)
      : 0;

  // 4. Synthesize AI Insights
  const getGrowthInsight = () => {
    if (growthRate >= 15) {
      return {
        title: 'تسارع استثنائي في وتيرة المبيعات',
        desc: `قفزة نمو بنسبة +${growthRate.toFixed(1)}% مقارنة بالفترة السابقة، مدعومة بحركة إقبال مرتفعة.`,
        icon: TrendingUp,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
      };
    }
    if (growthRate >= 0) {
      return {
        title: 'نمو مستقر وموجب',
        desc: `استمرار وتيرة المبيعات في الاتجاه التصاعدي بنسبة +${growthRate.toFixed(1)}%.`,
        icon: Activity,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50',
      };
    }
    return {
      title: 'تباطؤ في وتيرة الشراء',
      desc: `تراجع مؤقت بنسبة ${growthRate.toFixed(1)}%، يُوصى بتنشيط العروض الترويجية للأصناف الأكثر ركوداً.`,
      icon: TrendingDown,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
    };
  };

  const getReturnRiskInsight = () => {
    if (returnRate <= 3.5) {
      return {
        title: 'كفاءة تشغيلية ورضا مرتفع',
        desc: `معدل المردودات منخفض ومثالي (${returnRate.toFixed(1)}%)، مما يعكس جودة الأصناف ومطابقتها لطلبات العملاء.`,
        icon: ShieldCheck,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
      };
    }
    if (returnRate <= 7.0) {
      return {
        title: 'معدل المردودات في النطاق المعتاد',
        desc: `نسبة المرتجعات مستقرة عند ${returnRate.toFixed(1)}% من إجمالي المبيعات، تحت الرقابة الطبيعية.`,
        icon: Activity,
        color: 'text-cyan-600 dark:text-cyan-400',
        bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/50',
      };
    }
    return {
      title: 'تنبيه: ارتفاع ملحوظ في المردودات',
      desc: `بلغت المردودات ${returnRate.toFixed(1)}% من المبيعات، يُرجى تدقيق أسباب إرجاع الفواتير لتفادي خسائر الشحن والتشغيل.`,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50',
    };
  };

  const growthInsight = getGrowthInsight();
  const returnInsight = getReturnRiskInsight();

  // Recommendations generator
  const recommendations: string[] = [];
  if (cashRatio < 50) {
    recommendations.push(
      `السيولة النقدية تمثل ${cashRatio}% فقط؛ يُفضّل وضع خطة لتحصيل الذمم الآجلة وتسريع دورة النقد.`
    );
  } else {
    recommendations.push(
      `مستوى السيولة النقدية متين (${cashRatio}%)، مما يدعم المركز المالي والاستعداد للمشتريات الجديدة.`
    );
  }

  if (topProductShare >= 30 && topProducts[0]) {
    recommendations.push(
      `صنف "${topProducts[0].productName}" يستأثر بـ ${topProductShare}% من المبيعات؛ تأكد من وفرة مخزونه لتجنب نفاده.`
    );
  } else if (topProducts[0]) {
    recommendations.push(
      `تنوع متوازن في مبيعات الأصناف، مع تصدر صنف "${topProducts[0].productName}" القائمة.`
    );
  }

  if (topCustomerShare >= 25 && topCustomers[0]) {
    recommendations.push(
      `العميل "${topCustomers[0].customerName}" يمثل ${topCustomerShare}% من الإيراد؛ يُنصح بتقديم مزايا ولاء خاصة للحفاظ عليه.`
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30 p-5 shadow-lg shadow-indigo-500/5 transition-all duration-300 dark:border-indigo-800/40 dark:from-slate-900/90 dark:via-indigo-950/20 dark:to-slate-900/90">
      {/* Background Tech Accents */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-4 dark:border-indigo-900/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-md shadow-indigo-500/25">
            <Bot size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                رادار الذكاء الاصطناعي لتحليل المبيعات
              </h4>
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                <Sparkles size={11} className="text-indigo-500" />
                AI Executive Insights
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تحليل استنتاجي فوري لمؤشرات النمو ومعدل دوران الصفقات والتنبؤ المستقبلي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200/60 bg-white/70 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>تحليل مباشر</span>
          </div>

          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title={isExpanded ? 'طي لوحة الذكاء الاصطناعي' : 'توسيع لوحة الذكاء الاصطناعي'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 relative z-10 mt-5 space-y-4 duration-300">
          {/* Top 3 AI Diagnostic Cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* 1. Growth & Velocity */}
            <div
              className={`rounded-xl border p-4 backdrop-blur-sm transition-all ${growthInsight.bg}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-slate-900/80">
                  <growthInsight.icon size={16} className={growthInsight.color} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  اتجاه الزخم والنمو
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white">
                {growthInsight.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {growthInsight.desc}
              </p>
            </div>

            {/* 2. Predictive Run-Rate Forecast */}
            <div className="rounded-xl border border-purple-200/80 bg-purple-50/70 p-4 backdrop-blur-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-slate-900/80">
                    <Target size={16} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    التوقع التقديري للإيراد
                  </span>
                </div>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  AI Run-Rate
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-lg font-black text-purple-700 dark:text-purple-300">
                  ≈ {formatCurrency(projectedPeriodTotal)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {periodDaysRemaining > 0
                  ? `بناءً على وتيرة الشراء، متبقي ${periodDaysRemaining} يوم لتحقيق الحصيلة المتوقعة.`
                  : `الحصيلة المحققة للفترة المحددة بمتوسط سلة ${formatCurrency(avgBasket)}.`}
              </p>
            </div>

            {/* 3. Return & Operational Quality */}
            <div
              className={`rounded-xl border p-4 backdrop-blur-sm transition-all ${returnInsight.bg}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-slate-900/80">
                  <returnInsight.icon size={16} className={returnInsight.color} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  سلامة العمليات والمردودات
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white">
                {returnInsight.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {returnInsight.desc}
              </p>
            </div>
          </div>

          {/* Actionable Recommendations Row */}
          <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-2.5 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                توجيهات الذكاء الاصطناعي لتعظيم الأرباح
              </h5>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-xs text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:border-slate-700"
                >
                  <Award size={14} className="mt-0.5 shrink-0 text-indigo-500" />
                  <span className="leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesAIInsights;
