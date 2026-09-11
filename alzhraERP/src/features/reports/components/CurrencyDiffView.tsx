import React from 'react';
import { useCurrencyDiffs } from '../hooks';
import { formatCurrency } from '../../../core/utils';
import { RefreshCw, Info, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '../../../core/utils';
import ExcelTable from '../../../ui/common/ExcelTable';

/** صف فروق العملات كما يعيده `useCurrencyDiffs`. */
interface CurrencyDiffRow {
  name: string;
  account_type?: string;
  currency_code?: string;
  balance: number;
  unrealizedGain: number;
}

const CurrencyDiffView: React.FC = () => {
  const { data, isLoading } = useCurrencyDiffs();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12">
        <div className="border-3 h-10 w-10 animate-spin rounded-full border-slate-200 border-t-indigo-500" />
        <p className="text-xs font-bold text-slate-400">جاري جرد أرصدة العملات الأجنبية...</p>
      </div>
    );
  }

  const totalDiff = data?.reduce((s: number, a: CurrencyDiffRow) => s + a.unrealizedGain, 0) || 0;

  const columns = [
    {
      header: 'الحساب المالي',
      accessor: (row: CurrencyDiffRow) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 dark:text-white">{row.name}</span>
          <span className="text-[11px] font-medium text-slate-400">
            {row.account_type === 'Asset' || !row.account_type ? 'أصول متداولة' : row.account_type}
          </span>
        </div>
      ),
    },
    {
      header: 'كود العملة',
      accessor: (row: CurrencyDiffRow) => (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {row.currency_code}
          </span>
        </div>
      ),
      width: '120px',
    },
    {
      header: 'الرصيد الجاري',
      accessor: (row: CurrencyDiffRow) => (
        <span dir="ltr" className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
          {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
      className: 'text-left',
    },
    {
      header: 'أرباح/خسائر فروق الصرف',
      accessor: (row: CurrencyDiffRow) => (
        <div
          dir="ltr"
          className={`flex flex-col items-end ${row.unrealizedGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
        >
          <span className="font-mono text-xs font-bold">
            {row.unrealizedGain >= 0 ? '+' : ''}
            {formatCurrency(row.unrealizedGain)}
          </span>
          <div className="flex items-center gap-1">
            <div
              className={`h-1.5 w-1.5 rounded-full ${row.unrealizedGain >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
            <span className="text-[10px] font-medium text-slate-400">غير محققة</span>
          </div>
        </div>
      ),
      className: 'text-left bg-slate-50/50 dark:bg-slate-800/30',
    },
  ];

  return (
    <div className="animate-in fade-in space-y-4 duration-500">
      {/* Header Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex items-start gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
            <RefreshCw size={22} />
          </div>
          <div>
            <div className="mb-0.5 flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                فروق تحويل العملات الأجنبية
              </h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              يعتمد هذا التقرير على أسعار الصرف المسجلة، ويقوم باحتساب الفروق المالية غير المحققة
              للأرصدة البنكية والنقدية مقارنة بالعملة الأساسية.
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex flex-col justify-between rounded-xl border p-4 sm:p-5',
            totalDiff >= 0
              ? 'border-emerald-700 bg-emerald-600 text-white'
              : 'border-rose-700 bg-rose-600 text-white'
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              صافي فروق الصرف
            </span>
            <div className="rounded-md bg-white/20 p-1">
              {totalDiff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p
              dir="ltr"
              className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              {totalDiff >= 0 ? '+' : ''}
              {formatCurrency(totalDiff)}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/90">
            <Activity size={13} />
            <span>{totalDiff >= 0 ? 'أرباح فروق صرف غير محققة' : 'خسائر فروق صرف غير محققة'}</span>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-[var(--app-border)] bg-slate-50/50 p-3.5 dark:bg-slate-800/30 sm:p-4">
          <div className="h-4 w-1.5 rounded-full bg-indigo-500" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-white sm:text-sm">
            تفصيل الأرصدة النقدية الأجنبية
          </h4>
        </div>
        <div className="overflow-x-auto">
          <ExcelTable columns={columns} data={data || []} colorTheme="blue" />
        </div>
      </div>

      {/* Note */}
      <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 sm:p-4">
        <div className="flex-shrink-0 self-start rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
          <Info size={18} />
        </div>
        <div className="space-y-0.5">
          <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400">تنبيه محاسبي</h5>
          <p className="text-xs leading-relaxed text-amber-900/70 dark:text-amber-400/80">
            هذه الأرباح أو الخسائر المسجلة هي مبالغ "غير محققة" (Unrealized Gains/Losses) تعبر عن
            القيمة التقديرية الحالية للأرصدة النقدية عند تقييمها بسعر الصرف الحالي، ولا تعتبر تدفقات
            نقدية فعلية حتى تتم عملية الصرف أو التسوية.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CurrencyDiffView;
