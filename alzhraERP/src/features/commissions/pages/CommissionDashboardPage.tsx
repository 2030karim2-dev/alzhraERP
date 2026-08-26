import React from 'react';
import { Calculator, Clock3, Coins, FileWarning, RefreshCw, Sparkles } from 'lucide-react';
import { useCommissionDashboardData } from './useCommissionDashboardData';
import { DashboardAlerts, Metric, PendingInvoices, PeriodResults } from './CommissionDashboardWidgets';
import { formatCommissionMoney, formatCommissionNumber } from './commissionLabels';

type DashboardData = ReturnType<typeof useCommissionDashboardData>;

function CommissionHeader({ data, canRun }: { data: DashboardData; canRun: boolean }): React.JSX.Element {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-2 max-md:rounded-xl sm:px-5 sm:py-4">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-blue-500 via-violet-500 to-emerald-400" />
      <div className="flex flex-col gap-2 max-md:gap-1.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 pr-2">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-[var(--app-text-secondary)] sm:text-xs">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Coins size={14} />
            </span>
            <span>الإدارة المالية</span>
            <span className="text-[var(--app-border)]">/</span>
            <span>الحوافز والعمولات</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-bold tracking-tight text-[var(--app-text)] sm:text-2xl">لوحة عمولات المهندسين</h1>
            <span className="hidden items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:inline-flex">
              <Sparkles size={11} /> نظام محمي
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[var(--app-text-secondary)] sm:text-sm">
            متابعة الحسابات المرتبطة بالفواتير والتوزيعات والدفعات مع حماية مستقلة لفترات الاختبار.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 max-md:gap-0.5 sm:flex sm:flex-wrap">
          <button
            type="button"
            className="inline-flex min-h-8 max-md:min-h-7 items-center justify-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-card)] disabled:opacity-50 sm:min-h-10 sm:gap-2 sm:px-3 sm:text-sm"
            onClick={data.detect}
            disabled={data.detecting}
          >
            <RefreshCw size={14} className={data.detecting ? 'animate-spin' : ''} />
            {data.detecting ? 'جارٍ الفحص…' : 'تحديث الانتظار'}
          </button>
          <button
            type="button"
            className="inline-flex min-h-8 max-md:min-h-7 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:opacity-50 sm:min-h-10 sm:gap-2 sm:px-3 sm:text-sm"
            onClick={data.calculate}
            disabled={!canRun}
          >
            <Calculator size={14} className={data.calculating ? 'animate-spin' : ''} />
            {data.calculating ? 'جارٍ الحساب…' : 'تشغيل الحساب'}
          </button>
        </div>
      </div>
    </header>
  );
}

export default function CommissionDashboardPage(): React.JSX.Element {
  const data = useCommissionDashboardData();
  if (data.companyId === undefined || data.companyId.length === 0) return <div dir="rtl" className="p-4 text-sm text-[var(--app-text-secondary)] sm:p-6">لا يمكن تحميل بيانات العمولات قبل تحديد الشركة المرتبطة بالمستخدم.</div>;
  const currency = data.selectedPeriod?.currency_code ?? 'SAR';
  const isCalculableState = data.selectedPeriod?.state === 'open' || data.selectedPeriod?.state === 'calculated' || data.selectedPeriod?.is_test_period === true;
  const canRun = data.canCalculate && isCalculableState && !data.calculating;
  return <div dir="rtl" className="min-h-full bg-[var(--app-bg)] px-2 py-2 max-md:px-1.5 max-md:py-1.5 sm:p-6"><div className="mx-auto max-w-[1500px] space-y-2 max-md:space-y-1.5 sm:space-y-5"><CommissionHeader data={data} canRun={canRun} /><DashboardAlerts data={data} /><section className="grid grid-cols-2 gap-1.5 max-md:gap-1 sm:gap-3 lg:grid-cols-4"><Metric title="إجمالي العمولات" value={formatCommissionMoney(data.total, currency)} icon={<Coins size={16} />} tone="emerald" /><Metric title="المحصل المرتبط" value={formatCommissionMoney(data.collected, currency)} icon={<Coins size={16} />} tone="blue" /><Metric title="الفواتير المحتسبة" value={formatCommissionNumber(data.invoiceCount)} icon={<FileWarning size={16} />} tone="violet" /><Metric title="في قائمة الانتظار" value={formatCommissionNumber(data.pending.length)} icon={<Clock3 size={16} />} tone="amber" /></section><section className="grid gap-2 max-md:gap-1.5 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><PeriodResults data={data} /><PendingInvoices data={data} /></section></div></div>;
}
