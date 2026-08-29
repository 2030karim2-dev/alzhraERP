import React from 'react';
import { CircleAlert, ShieldCheck, Users } from 'lucide-react';
import type { CommissionPeriod } from '../types';
import { formatCommissionDate, formatCommissionMoney, formatCommissionNumber, periodStateLabels } from './commissionLabels';
import type { useCommissionDashboardData } from './useCommissionDashboardData';

type DashboardData = ReturnType<typeof useCommissionDashboardData>;

type MetricTone = 'emerald' | 'blue' | 'violet' | 'amber';

function metricStyle(tone: MetricTone): string {
  if (tone === 'emerald') return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600';
  if (tone === 'blue') return 'border-blue-500/20 bg-blue-500/5 text-blue-600';
  if (tone === 'violet') return 'border-violet-500/20 bg-violet-500/5 text-violet-600';
  return 'border-amber-500/20 bg-amber-500/5 text-amber-600';
}

export function Metric({ title, value, icon, tone }: { title: string; value: string; icon: React.ReactNode; tone: MetricTone }): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-1.5 max-md:rounded-lg sm:p-4">
      <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-md border max-md:mb-0.5 sm:mb-3 sm:h-9 sm:w-9 ${metricStyle(tone)}`}>{icon}</div>
      <p className="truncate text-[10px] max-md:text-[10px] text-[var(--app-text-secondary)] sm:text-xs">{title}</p>
      <p className="mt-0.5 truncate text-xs max-md:text-[10px] font-bold text-[var(--app-text)] sm:mt-1 sm:text-lg">{value}</p>
    </div>
  );
}

export function PeriodResults({ data }: { data: DashboardData }): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm max-md:rounded-lg">
      <div className="flex flex-col gap-1.5 border-b border-[var(--app-border)] px-2 py-2 max-md:gap-1 sm:gap-3 sm:p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0"><h2 className="text-sm font-semibold text-[var(--app-text)] sm:text-base">نتائج الفترة</h2><p className="mt-0.5 text-[10px] leading-4 text-[var(--app-text-secondary)] sm:text-xs">المهندسون ذوو assignment صالح وفواتير معتمدة.</p></div>
        <select className="h-7 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-1.5 text-[10px] max-md:h-6 sm:h-9 sm:w-auto sm:px-3 sm:text-sm" value={data.selectedPeriod?.id ?? ''} onChange={event => { data.setSelectedPeriodId(event.target.value); }} aria-label="اختيار فترة العمولات">
          {data.periods.map((period: CommissionPeriod) => <option key={period.id} value={period.id}>{period.period_label} — {periodStateLabels[period.state]}{period.is_test_period ? ' (اختبار)' : ''}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto scroll-x-hint-card">
        <table className="w-full min-w-[560px] text-[10px] max-md:text-[10px] sm:min-w-[720px] sm:text-sm">
          <thead><tr className="border-b border-[var(--app-border)] text-right text-[10px] text-[var(--app-text-secondary)] sm:text-xs"><th className="px-1.5 py-1 max-md:px-1 max-md:py-1 sm:p-4">المهندس</th><th className="px-1.5 py-1 max-md:px-1 max-md:py-1 sm:p-4">المبيعات</th><th className="px-1.5 py-1 max-md:px-1 max-md:py-1 sm:p-4">المحصل</th><th className="px-1.5 py-1 max-md:px-1 max-md:py-1 sm:p-4">الفواتير</th><th className="px-1.5 py-1 max-md:px-1 max-md:py-1 sm:p-4">الإجمالي</th></tr></thead>
          <tbody>{data.calculations.map(item => <tr key={item.id} className="border-b border-[var(--app-border)] last:border-0"><td className="px-3 py-2.5 font-medium text-[var(--app-text)] sm:p-4"><span className="inline-flex items-center gap-1.5"><Users size={13} className="text-emerald-600" />{item.user_id.slice(0, 8)}…</span></td><td className="px-3 py-2.5 text-[var(--app-text-secondary)] sm:p-4">{formatCommissionMoney(item.net_sales, item.currency_code)}</td><td className="px-3 py-2.5 text-[var(--app-text-secondary)] sm:p-4">{formatCommissionMoney(item.collected_amount, item.currency_code)}</td><td className="px-3 py-2.5 text-[var(--app-text-secondary)] sm:p-4">{formatCommissionNumber(item.invoice_count)}</td><td className="px-3 py-2.5 font-semibold text-emerald-600 sm:p-4">{formatCommissionMoney(item.total_commission, item.currency_code)}</td></tr>)}{data.calculations.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-[var(--app-text-secondary)] sm:p-10 sm:text-sm">لا توجد حسابات لهذه الفترة بعد.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardAlerts({ data }: { data: DashboardData }): React.JSX.Element {
  return <div className="space-y-2">{data.hasError && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-600 sm:text-sm"><CircleAlert size={16} className="mt-0.5 shrink-0" /> <span>تعذر تنفيذ العملية. تحقّق من الصلاحيات وحالة الفترة ثم أعد المحاولة.</span></div>}{data.selectedPeriod?.is_test_period === true && <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-600 sm:text-sm"><ShieldCheck size={16} className="mt-0.5 shrink-0" /> <span>هذه فترة اختبار. سيُسمح بالحساب والمراجعة فقط، وتبقى عمليات القفل والدفع والترحيل محمية على مستوى قاعدة البيانات.</span></div>}</div>;
}

export function PendingInvoices({ data }: { data: DashboardData }): React.JSX.Element {
  return <aside className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm max-md:rounded-lg"><div className="border-b border-[var(--app-border)] px-3 py-3 sm:p-4"><h2 className="text-sm font-semibold text-[var(--app-text)] sm:text-base">قائمة الفواتير المعلقة</h2><p className="mt-0.5 text-[10px] text-[var(--app-text-secondary)] sm:mt-1 sm:text-xs">فواتير مؤهلة بلا توزيع مهندس نشط.</p></div><div className="max-h-[360px] space-y-1 overflow-y-auto p-1.5 max-md:max-h-[300px] max-md:space-y-0.5 max-md:p-1 sm:max-h-[440px] sm:space-y-2 sm:p-3">{data.pending.map(item => <div key={item.id} className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-1.5 py-1 max-md:rounded-md max-md:px-1 max-md:py-0.5 sm:p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-[var(--app-text)] sm:text-sm">فاتورة {item.invoice_id.slice(0, 8)}…</span><span className="text-[10px] text-amber-600">{item.status === 'pending' ? 'معلقة' : 'موزعة'}</span></div><p className="mt-0.5 text-[10px] text-[var(--app-text-secondary)] sm:mt-1 sm:text-xs">اكتشفت في {formatCommissionDate(item.detected_at)}</p></div>)}{data.pending.length === 0 && <p className="px-2 py-6 text-center text-xs text-[var(--app-text-secondary)] sm:p-6 sm:text-sm">لا توجد فواتير معلقة.</p>}</div></aside>;
}
