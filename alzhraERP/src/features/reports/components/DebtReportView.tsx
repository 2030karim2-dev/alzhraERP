import React from 'react';
import { useDebtReport } from '../hooks';
import { formatCurrency, formatLocalDate } from '../../../core/utils';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import ShareButton from '../../../ui/common/ShareButton';
import ExcelTable from '../../../ui/common/ExcelTable';
import { cn } from '../../../core/utils';
import { ResponsiveGrid } from './MobileComponents';

/** صف ذمة (عميل/مورد) في تقرير الديون. */
interface DebtRow {
  name: string;
  type: 'customer' | 'supplier';
  remaining_amount: number;
}

const DebtReportView: React.FC = () => {
  const { data, isLoading } = useDebtReport();

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12">
        <div className="border-3 h-10 w-10 animate-spin rounded-full border-slate-200 border-t-blue-500" />
        <p className="text-xs font-bold tracking-wider text-slate-400">
          جاري مراجعة ذمم العملاء والموردين...
        </p>
      </div>
    );

  const receivables =
    data?.debts.filter(d => d.type === 'customer' && d.remaining_amount > 0) || [];
  const payables = data?.debts.filter(d => d.type === 'supplier' && d.remaining_amount < 0) || [];
  const netPosition = (data?.summary?.receivables || 0) - (data?.summary?.payables || 0);
  // report_debts returns base-currency amounts → format with the base currency.
  const baseCurrency = data?.summary.currency || 'SAR';

  const columns = [
    {
      header: 'الجهة المالية',
      accessor: (row: DebtRow) => (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-100">{row.name}</span>
      ),
    },
    {
      header: 'الفئة',
      accessor: (row: DebtRow) => (
        <span
          className={cn(
            'inline-block rounded-md px-2 py-0.5 text-xs font-bold',
            row.type === 'customer'
              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
          )}
        >
          {row.type === 'customer' ? 'عميل' : 'مورد'}
        </span>
      ),
      width: '100px',
      align: 'center' as const,
    },
    {
      header: 'الرصيد المتبقي',
      accessor: (row: DebtRow) => (
        <span
          dir="ltr"
          className={cn(
            'inline-block rounded-md px-2.5 py-1 font-mono text-xs font-bold',
            row.remaining_amount > 0
              ? 'border border-emerald-500/20 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'border border-rose-500/20 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
          )}
        >
          {formatCurrency(Math.abs(row.remaining_amount), baseCurrency)}
        </span>
      ),
      className: 'text-left',
    },
  ];

  return (
    <div className="animate-in fade-in space-y-4 duration-500">
      {/* Summary Grid */}
      <ResponsiveGrid cols={3}>
        {/* Receivables Card */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              إجمالي مستحقات العملاء
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <h3
            dir="ltr"
            className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl"
          >
            {formatCurrency(data?.summary.receivables || 0, baseCurrency)}
          </h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Users size={13} />
            <span>{receivables.length} مطالبة نشطة</span>
          </div>
        </div>

        {/* Payables Card */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
              ديون مستحقة للموردين
            </span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <TrendingDown size={16} />
            </div>
          </div>
          <h3
            dir="ltr"
            className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl"
          >
            {formatCurrency(data?.summary.payables || 0, baseCurrency)}
          </h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Users size={13} />
            <span>{payables.length} فاتورة التزام</span>
          </div>
        </div>

        {/* Net Position Card */}
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border p-4 sm:p-5',
            netPosition >= 0
              ? 'border-blue-700 bg-blue-600 text-white dark:border-blue-600'
              : 'border-slate-800 bg-slate-900 text-white'
          )}
        >
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
              صافي المركز المالي
            </span>
            <span className="rounded-md border border-white/20 bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">
              {netPosition >= 0 ? 'فائض مستحق' : 'عجز ملتزم'}
            </span>
          </div>
          <h3
            dir="ltr"
            className="font-mono text-xl font-bold tracking-tight text-white sm:text-2xl"
          >
            {formatCurrency(Math.abs(netPosition), baseCurrency)}
          </h3>
          <div className="mt-2 flex items-center justify-between pt-1">
            <span className="text-xs text-blue-100">
              {netPosition >= 0 ? 'رصيد لصالح المنشأة' : 'التزامات قائمة على المنشأة'}
            </span>
            <ShareButton
              size="sm"
              eventType="debt_report"
              title="مشاركة المركز"
              className="rounded-lg bg-white/20 px-2.5 py-1 text-xs text-white transition-all hover:bg-white/30"
              message={`📊 تقرير المركز المالي - الزهراء سمارت\n━━━━━━━━━━━━━━\n✅ مستحقات (عملاء): ${formatCurrency(data?.summary.receivables || 0, baseCurrency)}\n🔴 التزامات (موردين): ${formatCurrency(data?.summary.payables || 0, baseCurrency)}\n📊 صافي المركز: ${formatCurrency(Math.abs(netPosition), baseCurrency)} ${netPosition >= 0 ? '(لصالحك)' : '(عليك)'}\n📅 التاريخ: ${formatLocalDate(new Date())}`}
            />
          </div>
        </div>
      </ResponsiveGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Receivables Details */}
        <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] p-3.5 sm:p-4">
            <h4 className="flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-white">
              <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={15} />
              </div>
              كشف مستحقات العملاء
            </h4>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {receivables.length} عميل
            </span>
          </div>
          <div className="overflow-x-auto">
            <ExcelTable columns={columns} data={receivables} colorTheme="green" />
          </div>
        </div>

        {/* Payables Details */}
        <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] p-3.5 sm:p-4">
            <h4 className="flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-white">
              <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400">
                <TrendingDown size={15} />
              </div>
              كشف التزامات الموردين
            </h4>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {payables.length} مورد
            </span>
          </div>
          <div className="overflow-x-auto">
            <ExcelTable columns={columns} data={payables} colorTheme="orange" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtReportView;
