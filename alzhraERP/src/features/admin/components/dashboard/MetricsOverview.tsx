import React from 'react';
import {
  Building2,
  Users,
  Receipt,
  Bot,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import type { PlatformMetrics, AdminTab } from '../../types';
import { calcCacheHitRate } from '../../utils';

interface MetricsOverviewProps {
  metrics?: PlatformMetrics | undefined;
  isLoading: boolean;
  isError?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  onNavigateTab: (tab: AdminTab) => void;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metrics,
  isLoading,
  isError = false,
  onRetry,
  onNavigateTab,
}) => {
  if (isError && !metrics) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-rose-600">
          <ShieldAlert size={16} />
          <span>تعذر تحميل إحصائيات المنصة. تحقق من الاتصال وحاول مجدداً.</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-500/10"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="grid animate-pulse grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div
            key={i}
            className="h-24 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]"
          />
        ))}
      </div>
    );
  }

  const activePercent =
    metrics.total_companies > 0
      ? Math.round((metrics.active_companies / metrics.total_companies) * 100)
      : 0;

  const cacheHitPercent = calcCacheHitRate(metrics.total_ai_requests, metrics.ai_cache_hits);

  return (
    <div className="space-y-4">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Companies Card */}
        <div
          onClick={() => onNavigateTab('companies')}
          className="group cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs transition-all hover:border-blue-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
              إجمالي المنشآت
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-[var(--app-text)]">
              {metrics.total_companies}
            </span>
            <span className="flex items-center text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              {metrics.active_companies} نشطة ({activePercent}%)
            </span>
          </div>
          <div className="border-[var(--app-border)]/60 mt-2.5 flex items-center justify-between border-t pt-2 text-[10px] text-[var(--app-text-secondary)]">
            <span>إدارة المنشآت</span>
            <ArrowUpRight
              size={12}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </div>
        </div>

        {/* Global Users Card */}
        <div
          onClick={() => onNavigateTab('users')}
          className="group cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs transition-all hover:border-indigo-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
              المستخدمين المسجلين
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-[var(--app-text)]">{metrics.total_users}</span>
            <span className="text-[10px] font-bold text-indigo-500">حسابات نشطة</span>
          </div>
          <div className="border-[var(--app-border)]/60 mt-2.5 flex items-center justify-between border-t pt-2 text-[10px] text-[var(--app-text-secondary)]">
            <span>دليل المستخدمين</span>
            <ArrowUpRight
              size={12}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </div>
        </div>

        {/* Total Invoices Card */}
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
              الفواتير والعمليات
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Receipt size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-[var(--app-text)]">
              {metrics.total_invoices}
            </span>
            <span className="flex items-center text-[10px] font-black text-blue-600 dark:text-blue-400">
              +{metrics.today_invoices} اليوم
            </span>
          </div>
          <div className="border-[var(--app-border)]/60 mt-2.5 flex items-center justify-between border-t pt-2 text-[10px] text-[var(--app-text-secondary)]">
            <span>عبر جميع الشركات</span>
            <TrendingUp size={12} className="text-emerald-500" />
          </div>
        </div>

        {/* AI & Intelligence Card */}
        <div
          onClick={() => onNavigateTab('telemetry')}
          className="group cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs transition-all hover:border-purple-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
              استهلاك الذكاء الاصطناعي
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Bot size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-[var(--app-text)]">
              {metrics.total_ai_requests}
            </span>
            <span className="text-[10px] font-bold text-purple-500">
              كاش: {metrics.ai_cache_hits} ({cacheHitPercent}%)
            </span>
          </div>
          <div className="border-[var(--app-border)]/60 mt-2.5 flex items-center justify-between border-t pt-2 text-[10px] text-[var(--app-text-secondary)]">
            <span>مراقبة التكاليف والـ AI</span>
            <ArrowUpRight
              size={12}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </div>
        </div>
      </div>

      {/* Secondary Row: Subscription Distribution & Security Pulse */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Subscription Status Breakdown */}
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs lg:col-span-2">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-blue-500" />
              <h2 className="text-xs font-black text-[var(--app-text)]">
                توزيع الاشتراكات وحالات المنشآت
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('subscriptions')}
              className="text-[10px] font-bold text-blue-500 hover:underline"
            >
              إدارة الباقات
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5">
              <div className="flex items-center justify-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} />
                <span>نشطة</span>
              </div>
              <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">
                {metrics.active_companies}
              </p>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5">
              <div className="flex items-center justify-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400">
                <Clock size={13} />
                <span>تجريبية (Trial)</span>
              </div>
              <p className="mt-1 text-lg font-black text-amber-700 dark:text-amber-300">
                {metrics.trial_companies}
              </p>
            </div>

            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5">
              <div className="flex items-center justify-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400">
                <Ban size={13} />
                <span>معلقة / موقوفة</span>
              </div>
              <p className="mt-1 text-lg font-black text-rose-700 dark:text-rose-300">
                {metrics.suspended_companies}
              </p>
            </div>
          </div>
        </div>

        {/* Security & Honeypot Pulse */}
        <div
          onClick={() => onNavigateTab('security')}
          className="group cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs transition-all hover:border-rose-500/40"
        >
          <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert size={15} className="text-rose-500" />
              <h2 className="text-xs font-black text-[var(--app-text)]">
                جدار الأمان والـ Honeypot
              </h2>
            </div>
            <span className="text-[10px] font-bold text-rose-500 group-hover:underline">
              سجلات الأمان
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-lg bg-[var(--app-surface-hover)] p-2 text-xs">
              <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
                هجمات مصيدة الـ Honeypot
              </span>
              <span className="font-black text-rose-500">{metrics.honeypot_alerts}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--app-surface-hover)] p-2 text-xs">
              <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
                تقارير انتهاك سياسة CSP
              </span>
              <span className="font-black text-amber-500">{metrics.csp_reports}</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <span>الحماية الاستباقية تعمل</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
