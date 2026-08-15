import React from 'react';
import { Download, Printer } from 'lucide-react';
import { useCommissionReportData } from './useCommissionReportData';
import { downloadCommissionCsv } from './commissionReportExport';
import { ReportSummary, ReportTable } from './CommissionReportComponents';

export default function CommissionReportsPage(): React.JSX.Element {
  const { companyId, periods, period, rows, totals, setSelectedPeriodId } = useCommissionReportData();
  if (companyId === undefined || companyId.length === 0) return <main dir="rtl" className="p-6 text-[var(--app-text-secondary)]">لا يمكن تحميل التقرير قبل تحديد الشركة.</main>;
  return <main dir="rtl" className="min-h-full bg-[var(--app-bg)] p-4 sm:p-6" id="commission-report"><div className="mx-auto max-w-7xl space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm text-[var(--app-text-secondary)]">الحوافز / التقارير</p><h1 className="mt-1 text-2xl font-bold text-[var(--app-text)]">تقرير عمولات الفترة</h1><label className="mt-3 flex max-w-xs items-center gap-2 text-sm text-[var(--app-text-secondary)]"><span className="shrink-0">الفترة</span><select className="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2 text-[var(--app-text)]" value={period?.id ?? ''} onChange={event => { setSelectedPeriodId(event.target.value || undefined); }} aria-label="اختيار فترة التقرير">{periods.map(item => <option key={item.id} value={item.id}>{item.period_label}</option>)}</select></label></div><div className="no-print flex gap-2"><button type="button" onClick={() => { downloadCommissionCsv(rows); }} disabled={rows.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Download size={16} />CSV</button><button type="button" onClick={() => { window.print(); }} className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-text)]"><Printer size={16} />طباعة</button></div></header><ReportSummary totals={totals} /><ReportTable rows={rows} /></div></main>;
}
