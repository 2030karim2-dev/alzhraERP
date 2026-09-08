import React, { useState } from 'react';
import {
  Building2,
  Users,
  Receipt,
  Bot,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Plus,
  Shield,
  Layers,
  Wrench,
  CheckCircle,
} from 'lucide-react';
import type { PlatformMetrics, AdminTab } from '../../types';
import { calcCacheHitRate } from '../../utils';
import { useSystemConfigs, useConfigMutations } from '../../hooks/useAdminData';
import Button from '../../../../ui/base/Button';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';

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
  const { data: configs } = useSystemConfigs();
  const { updateConfig, isUpdating } = useConfigMutations();
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const isMaintenanceActive = configs?.maintenance_mode.enabled ?? false;

  const handleToggleMaintenance = async () => {
    if (!configs) return;
    try {
      await updateConfig({
        key: 'maintenance_mode',
        value: {
          ...configs.maintenance_mode,
          enabled: !isMaintenanceActive,
        },
      });
    } finally {
      setShowMaintenanceModal(false);
    }
  };

  if (isError && !metrics) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-rose-600">
          <ShieldAlert size={16} />
          <span>تعذر تحميل إحصائيات المنصة. تحقق من الاتصال وحاول مجدداً.</span>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="mt-3 text-xs">
            إعادة المحاولة
          </Button>
        )}
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]"
            />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]" />
      </div>
    );
  }

  const activePercent =
    metrics.total_companies > 0
      ? Math.round((metrics.active_companies / metrics.total_companies) * 100)
      : 0;

  const cacheHitPercent = calcCacheHitRate(metrics.total_ai_requests, metrics.ai_cache_hits);

  return (
    <div className="space-y-3.5">
      {/* 1. Quick Administrative Action Cockpit */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-blue-600 dark:text-blue-400">
            <Wrench size={14} />
          </span>
          <div>
            <h2 className="text-xs font-bold text-[var(--app-text)]">إجراءات الإشراف السريعة</h2>
            <p className="text-[11px] text-[var(--app-text-secondary)]">
              تحكم فوري بوضع الصيانة، الباقات، وسجلات الأمان
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={isMaintenanceActive ? 'danger' : 'outline'}
            onClick={() => setShowMaintenanceModal(true)}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
            title="تبديل وضع الصيانة"
          >
            <AlertTriangle size={13} />
            <span>{isMaintenanceActive ? 'إلغاء وضع الصيانة' : 'تفعيل وضع الصيانة'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => onNavigateTab('subscriptions')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
          >
            <Plus size={13} />
            <span>إضافة باقة</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => onNavigateTab('security')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
          >
            <Shield size={13} />
            <span>سجلات الأمان</span>
          </Button>

          {onRetry && (
            <Button
              variant="outline"
              onClick={onRetry}
              className="flex items-center gap-1.5 px-2 py-1 text-xs"
              title="تحديث البيانات"
            >
              <RefreshCw size={12} />
            </Button>
          )}
        </div>
      </div>

      {/* 2. Primary KPI Grid — Clean, High-Density, Calm Monochromatic Surfaces */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Companies Card */}
        <div
          onClick={() => onNavigateTab('companies')}
          className="group cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs transition-colors hover:border-blue-500/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
              إجمالي المنشآت
            </span>
            <Building2 size={15} className="text-[var(--app-text-secondary)]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-[var(--app-text)]">
              {metrics.total_companies}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.active_companies} نشطة ({activePercent}%)
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--app-border)] pt-2 text-[11px] text-[var(--app-text-secondary)]">
            <span>إدارة المنشآت</span>
            <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Global Users Card */}
        <div
          onClick={() => onNavigateTab('users')}
          className="group cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs transition-colors hover:border-blue-500/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
              المستخدمين المسجلين
            </span>
            <Users size={15} className="text-[var(--app-text-secondary)]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-[var(--app-text)]">{metrics.total_users}</span>
            <span className="text-[11px] text-[var(--app-text-secondary)]">حسابات نشطة</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--app-border)] pt-2 text-[11px] text-[var(--app-text-secondary)]">
            <span>دليل المستخدمين</span>
            <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Total Invoices Card */}
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
              الفواتير والعمليات
            </span>
            <Receipt size={15} className="text-[var(--app-text-secondary)]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-[var(--app-text)]">
              {metrics.total_invoices}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <TrendingUp size={11} />+{metrics.today_invoices} اليوم
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--app-border)] pt-2 text-[11px] text-[var(--app-text-secondary)]">
            <span>عبر كافة المنشآت</span>
            <span className="font-mono text-[10px]">SAR / YER</span>
          </div>
        </div>

        {/* AI & Intelligence Card */}
        <div
          onClick={() => onNavigateTab('telemetry')}
          className="group cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs transition-colors hover:border-blue-500/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--app-text-secondary)]">
              استهلاك الذكاء الاصطناعي
            </span>
            <Bot size={15} className="text-[var(--app-text-secondary)]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-[var(--app-text)]">
              {metrics.total_ai_requests}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              وفر الكاش: {cacheHitPercent}%
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--app-border)] pt-2 text-[11px] text-[var(--app-text-secondary)]">
            <span>مراقبة الخدمات</span>
            <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* 3. High-Density Status Distribution & Security Pulse Row */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        {/* Subscription Status Breakdown */}
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs lg:col-span-2">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-2">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-blue-500" />
              <h3 className="text-xs font-bold text-[var(--app-text)]">
                توزيع الاشتراكات وحالات المنشآت
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('subscriptions')}
              className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              إدارة الباقات
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                نشطة
              </span>
              <p className="mt-0.5 text-base font-black text-emerald-700 dark:text-emerald-300">
                {metrics.active_companies}
              </p>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                تجريبية
              </span>
              <p className="mt-0.5 text-base font-black text-amber-700 dark:text-amber-300">
                {metrics.trial_companies}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2">
              <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">متأخرة</span>
              <p className="mt-0.5 text-base font-black text-[var(--app-text)]">
                {metrics.past_due_companies ?? 0}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2">
              <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">ملغاة</span>
              <p className="mt-0.5 text-base font-black text-[var(--app-text)]">
                {metrics.cancelled_companies ?? 0}
              </p>
            </div>

            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">موقوفة</span>
              <p className="mt-0.5 text-base font-black text-rose-700 dark:text-rose-300">
                {metrics.suspended_companies}
              </p>
            </div>
          </div>
        </div>

        {/* Security & Threat Posture */}
        <div
          onClick={() => onNavigateTab('security')}
          className="group cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs transition-colors hover:border-rose-500/40"
        >
          <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-rose-500" />
              <h3 className="text-xs font-bold text-[var(--app-text)]">مركز الأمان والإنذار</h3>
            </div>
            <span className="text-[11px] font-bold text-rose-600 group-hover:underline dark:text-rose-400">
              السجلات
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                تنبيهات غير محلولة:
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {metrics.honeypot_alerts}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                تقارير انتهاك CSP:
              </span>
              <span className="font-bold text-[var(--app-text)]">{metrics.csp_reports}</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={12} />
                <span>حماية المنصة نشطة</span>
              </span>
              <span className="text-[10px] text-[var(--app-text-secondary)]">Auto Guard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Quick Maintenance Toggle */}
      <ConfirmModal
        isOpen={showMaintenanceModal}
        title={isMaintenanceActive ? 'إلغاء تفعيل وضع الصيانة' : 'تفعيل وضع الصيانة العام'}
        message={
          isMaintenanceActive
            ? 'سيتم إعادة إتاحة المنصة لجميع المستخدمين والشركات فوراً.'
            : 'تفعيل وضع الصيانة سيمنع دخول المستخدمين العاديين، ويسمح فقط للمشرفين بإجراء التحديثات.'
        }
        confirmLabel={isMaintenanceActive ? 'إلغاء وضع الصيانة' : 'تأكيد تفعيل الصيانة'}
        cancelLabel="تراجع"
        variant={isMaintenanceActive ? 'primary' : 'danger'}
        onConfirm={handleToggleMaintenance}
        onClose={() => setShowMaintenanceModal(false)}
      />
    </div>
  );
};
export default MetricsOverview;
