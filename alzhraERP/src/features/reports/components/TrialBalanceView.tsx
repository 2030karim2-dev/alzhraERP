import React from 'react';
import { useTrialBalance } from '../hooks';
import ExcelTable from '../../../ui/common/ExcelTable';
import { formatCurrency, formatLocalDate } from '../../../core/utils';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import ShareButton from '../../../ui/common/ShareButton';
import { cn } from '../../../core/utils';

/** صف ميزان المراجعة كما يعيده useTrialBalance/reportsService.getTrialBalance */
interface TrialBalanceRowView {
  id: string;
  code: string;
  name: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}

const TrialBalanceView: React.FC = () => {
  const { data, isLoading } = useTrialBalance();

  if (isLoading)
    return (
      <div className="animate-pulse p-12 text-center text-sm font-bold tracking-wider text-slate-400">
        تحميل ميزان المراجعة...
      </div>
    );

  const columns = [
    {
      header: 'كود الحساب',
      accessor: (row: TrialBalanceRowView) => (
        <span className="font-mono text-xs font-bold text-blue-600">{row.code}</span>
      ),
      width: '110px',
    },
    {
      header: 'اسم الحساب المحاسبي',
      accessor: (row: TrialBalanceRowView) => (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-100">{row.name}</span>
      ),
    },
    {
      header: 'إجمالي المدين',
      accessor: (row: TrialBalanceRowView) => (
        <span dir="ltr" className="font-mono text-xs font-bold text-emerald-600">
          {formatCurrency(row.totalDebit)}
        </span>
      ),
      className: 'text-left bg-emerald-500/5',
    },
    {
      header: 'إجمالي الدائن',
      accessor: (row: TrialBalanceRowView) => (
        <span dir="ltr" className="font-mono text-xs font-bold text-rose-600">
          {formatCurrency(row.totalCredit)}
        </span>
      ),
      className: 'text-left bg-rose-500/5',
    },
    {
      header: 'الرصيد الصافي',
      accessor: (row: TrialBalanceRowView) => (
        <span
          dir="ltr"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold',
            row.netBalance >= 0
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          )}
        >
          <span>{row.netBalance >= 0 ? 'مدين' : 'دائن'}</span>
          <span className="font-mono">{formatCurrency(Math.abs(row.netBalance))}</span>
        </span>
      ),
      className: 'text-left font-bold bg-slate-50 dark:bg-slate-800',
    },
  ];

  const totalDr = data?.reduce((s: number, r: TrialBalanceRowView) => s + r.totalDebit, 0) || 0;
  const totalCr = data?.reduce((s: number, r: TrialBalanceRowView) => s + r.totalCredit, 0) || 0;
  const diff = Math.abs(totalDr - totalCr);
  const isBalanced = diff < 0.1;

  return (
    <div className="animate-in fade-in space-y-4 duration-500">
      {/* Dynamic Status Banner */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-between overflow-hidden rounded-xl border p-3.5 sm:flex-row sm:p-4',
          isBalanced
            ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
            : 'border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10'
        )}
      >
        <div className="relative z-10 flex items-center gap-3">
          <div
            className={cn(
              'rounded-xl p-2.5 text-white shadow-sm',
              isBalanced ? 'bg-emerald-500' : 'bg-rose-500'
            )}
          >
            {isBalanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white sm:text-base">
              {isBalanced ? 'الميزان متزن محاسبياً' : 'يوجد تباين في مراجعة الميزان'}
            </h4>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isBalanced
                ? 'تطابق تام بين الحركات المدينة والدائنة'
                : `فارق مالي قدره ${diff.toLocaleString('en-US')} ريال`}
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-3 flex items-center gap-4 sm:mt-0">
          <div className="flex h-9 flex-col justify-center border-l border-slate-200 pl-4 text-right dark:border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              التباين الفعلي
            </p>
            <p
              dir="ltr"
              className={cn(
                'font-mono text-base font-bold sm:text-lg',
                isBalanced
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {formatCurrency(diff)}
            </p>
          </div>
          <ShareButton
            size="sm"
            showLabel
            eventType="trial_balance"
            title="مشاركة ميزان المراجعة"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            message={`⚖️ ميزان المراجعة - الزهراء سمارت\n━━━━━━━━━━━━━━\n📊 الحالة: ${isBalanced ? '✅ متزن تماماً' : '❌ غير متزن'}\n📗 إجمالي المدين: ${formatCurrency(totalDr)}\n📕 إجمالي الدائن: ${formatCurrency(totalCr)}\n📐 التباين: ${formatCurrency(diff)}\n📅 التاريخ: ${formatLocalDate(new Date())}`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <ExcelTable columns={columns} data={data || []} colorTheme="blue" />
        </div>

        {/* Summary Footer */}
        <div className="flex flex-col items-center justify-between gap-3 bg-slate-900 p-3.5 dark:bg-slate-900/80 sm:flex-row sm:p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-slate-300">ملخص الأرصدة الختامية</span>
          </div>

          <div className="flex gap-6 sm:gap-8">
            <div className="text-left">
              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-emerald-400 opacity-80">
                إجمالي المدين
              </span>
              <span dir="ltr" className="font-mono text-sm font-bold text-emerald-400 sm:text-base">
                {formatCurrency(totalDr)}
              </span>
            </div>
            <div className="border-r border-slate-700/60 pr-4 text-left sm:pr-8">
              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-rose-400 opacity-80">
                إجمالي الدائن
              </span>
              <span dir="ltr" className="font-mono text-sm font-bold text-rose-400 sm:text-base">
                {formatCurrency(totalCr)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TrialBalanceView;
