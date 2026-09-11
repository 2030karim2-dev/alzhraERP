import React from 'react';
import { useFinancials } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react';
import { cn } from '../../../../core/utils';
import ShareButton from '../../../../ui/common/ShareButton';

interface Props {
  dateRange: { from: string; to: string };
}

const FinancialReportBlock: React.FC<{
  title: string;
  icon: any;
  data: any[];
  total: number;
  color: 'emerald' | 'rose';
}> = ({ title, icon: Icon, data, total, color }) => {
  const theme = {
    emerald: {
      icon: 'bg-emerald-500 text-white',
      header: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400',
      total: 'bg-emerald-600 text-white',
    },
    rose: {
      icon: 'bg-rose-500 text-white',
      header: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400',
      total: 'bg-rose-600 text-white',
    },
  };
  const currentTheme = theme[color];

  return (
    <div className="flex flex-col border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div
        className={`flex items-center gap-2 border-b border-[var(--app-border)] p-3 max-md:p-2 ${currentTheme.header}`}
      >
        <div className={`p-1.5 shadow-sm max-md:p-1 ${currentTheme.icon}`}>
          <Icon size={14} />
        </div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="flex-1 space-y-px p-2 max-md:p-1">
        {data.map((item: any) => (
          <div
            key={item.code}
            className="flex justify-between p-2 hover:bg-[var(--app-surface-hover)] max-md:p-1.5"
          >
            <span className="text-[11px] font-bold text-[var(--app-text)]">{item.name}</span>
            <span dir="ltr" className="font-mono text-xs font-bold text-[var(--app-text)]">
              {formatCurrency(item.net_balance)}
            </span>
          </div>
        ))}
      </div>
      <div
        className={`flex items-center justify-between border-t border-[var(--app-border)] p-3 max-md:p-2 ${currentTheme.total}`}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest">الإجمالي</span>
        <span dir="ltr" className="font-mono text-base font-bold">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
};

const IncomeStatement: React.FC<Props> = ({ dateRange }) => {
  const { data: financials, isLoading } = useFinancials(dateRange.from, dateRange.to);

  if (isLoading)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Loader2 className="mb-4 animate-spin text-orange-500" size={40} />
        <p className="font-medium text-[var(--app-text-secondary)]">جاري إعداد قائمة الدخل...</p>
      </div>
    );

  if (!financials)
    return (
      <div className="p-8 text-center text-[var(--app-text-secondary)] max-md:p-4">
        لا توجد بيانات مالية متاحة لهذه الفترة
      </div>
    );

  const {
    revenues,
    expenses,
    netIncome,
    totalRevenue: serverRevenue,
    totalExpense: serverExpense,
  } = financials.incomeStatement;
  const totalRevenue =
    serverRevenue ?? revenues.reduce((s: number, r: any) => s + (r.net_balance || 0), 0);
  const totalExpense =
    serverExpense ?? expenses.reduce((s: number, r: any) => s + (r.net_balance || 0), 0);

  return (
    <div className="print-area animate-in slide-in-from-bottom-4 mx-auto max-w-none space-y-4 pb-12 duration-500">
      {/* Report Header */}
      <div className="flex items-center justify-between border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-center shadow-sm max-md:p-2">
        <div className="text-start">
          <h2 className="text-lg font-bold uppercase tracking-tight text-[var(--app-text)]">
            قائمة الدخل
          </h2>
          <h3 className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
            Income Statement
          </h3>
        </div>

        <div className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-1.5 text-xs text-[var(--app-text-secondary)]">
          <Calendar size={12} />
          <span className="text-[10px] font-bold">
            من{' '}
            <b dir="ltr" className="text-[var(--app-text)]">
              {dateRange.from}
            </b>{' '}
            إلى{' '}
            <b dir="ltr" className="text-[var(--app-text)]">
              {dateRange.to}
            </b>
          </span>
        </div>

        <div className="flex items-center gap-3 max-md:gap-2">
          <ShareButton
            size="sm"
            showLabel
            eventType="income_statement"
            title="مشاركة قائمة الدخل"
            message={`📑 قائمة الدخل\n━━━━━━━━━━━━━━\n📗 إجمالي الإيرادات: ${formatCurrency(totalRevenue)}\n📕 إجمالي المصروفات: ${formatCurrency(totalExpense)}\n${netIncome >= 0 ? '✅' : '🔴'} صافي ${netIncome >= 0 ? 'الربح' : 'الخسارة'}: ${formatCurrency(Math.abs(netIncome))}\n📅 الفترة: من ${dateRange.from} إلى ${dateRange.to}`}
          />
          <div className="bg-slate-900 p-2 text-white max-md:p-1.5">
            <FileText size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 max-md:gap-3 md:grid-cols-2">
        <FinancialReportBlock
          title="الإيرادات"
          icon={TrendingUp}
          data={revenues}
          total={totalRevenue}
          color="emerald"
        />
        <FinancialReportBlock
          title="المصروفات"
          icon={TrendingDown}
          data={expenses}
          total={totalExpense}
          color="rose"
        />
      </div>

      {/* Net Income Summary — static emphasis, no hover scale, no decorative blur */}
      <div
        className={cn(
          'flex flex-col items-center justify-between gap-3 border-2 p-4 max-md:gap-2 max-md:p-3 md:flex-row',
          netIncome >= 0
            ? 'border-emerald-500 bg-[var(--app-surface)]'
            : 'border-rose-300 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20'
        )}
      >
        <div className="flex items-center gap-3 max-md:gap-2">
          <div
            className={cn(
              'p-3 max-md:p-2',
              netIncome >= 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-200 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
            )}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <h3
              className={cn(
                'text-base font-bold',
                netIncome >= 0 ? 'text-[var(--app-text)]' : 'text-rose-800 dark:text-rose-400'
              )}
            >
              {netIncome >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
            </h3>
            <p
              className={cn(
                'text-[10px] font-bold opacity-80',
                netIncome >= 0
                  ? 'text-[var(--app-text-secondary)]'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              Net Income / Loss
            </p>
          </div>
        </div>

        <div
          dir="ltr"
          className={cn(
            'font-mono text-3xl font-bold tracking-tight max-md:text-2xl',
            netIncome >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          )}
        >
          {formatCurrency(netIncome)}
        </div>
      </div>
    </div>
  );
};

export default IncomeStatement;
