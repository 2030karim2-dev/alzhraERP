import React from 'react';
import { useFinancials } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  Package,
} from 'lucide-react';
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
  color: 'emerald' | 'rose' | 'amber';
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
    amber: {
      icon: 'bg-amber-500 text-white',
      header: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
      total: 'bg-amber-600 text-white',
    },
  };

  return (
    <div className="border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div
        className={cn(
          'flex items-center justify-between border-b border-[var(--app-border)] p-2.5',
          theme[color].header
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5', theme[color].icon)}>
            <Icon size={14} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-tight">{title}</h3>
        </div>
        <span className="text-[10px] font-bold opacity-75">{data.length} حسابات</span>
      </div>

      <div className="max-h-[360px] divide-y divide-[var(--app-border)] overflow-y-auto">
        {data.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--app-text-secondary)]">
            لا توجد حركات مسجلة
          </div>
        ) : (
          data.map(item => (
            <div
              key={item.account_id}
              className="flex items-center justify-between p-2 text-xs transition-colors hover:bg-[var(--app-surface-hover)]"
            >
              <div>
                <span className="font-bold text-[var(--app-text)]">{item.name}</span>
                <span className="ms-2 font-mono text-[10px] text-[var(--app-text-secondary)]">
                  {item.code}
                </span>
              </div>
              <span dir="ltr" className="font-mono font-bold text-[var(--app-text)]">
                {formatCurrency(item.net_balance)}
              </span>
            </div>
          ))
        )}
      </div>

      <div
        className={cn(
          'flex items-center justify-between border-t border-[var(--app-border)] p-2.5',
          theme[color].total
        )}
      >
        <span className="text-xs font-bold uppercase">الإجمالي</span>
        <span dir="ltr" className="font-mono text-sm font-bold">
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

  const { revenues, expenses, netIncome, totalRevenue: serverRevenue } = financials.incomeStatement;
  const totalRevenue =
    serverRevenue ?? revenues.reduce((s: number, r: any) => s + (r.net_balance || 0), 0);

  const cogsList = expenses.filter(
    (r: any) => r.is_cogs || r.code === '5100' || String(r.code).startsWith('51')
  );
  const operatingExpensesList = expenses.filter(
    (r: any) => !(r.is_cogs || r.code === '5100' || String(r.code).startsWith('51'))
  );
  const totalCogs = cogsList.reduce((s: number, r: any) => s + (r.net_balance || 0), 0);
  const totalOperatingExpenses = operatingExpensesList.reduce(
    (s: number, r: any) => s + (r.net_balance || 0),
    0
  );
  const grossProfit = totalRevenue - totalCogs;

  return (
    <div className="print-area animate-in slide-in-from-bottom-4 mx-auto max-w-none space-y-4 pb-12 duration-500">
      {/* Report Header */}
      <div className="flex items-center justify-between border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-center shadow-sm max-md:p-2">
        <div className="text-start">
          <h2 className="text-lg font-bold uppercase tracking-tight text-[var(--app-text)]">
            قائمة الدخل المرحلية
          </h2>
          <h3 className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
            Multi-Step Income Statement
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
            message={`📑 قائمة الدخل المرحلية\n━━━━━━━━━━━━━━\n📗 إجمالي الإيرادات: ${formatCurrency(totalRevenue)}\n📦 تكلفة البضاعة المباعة: ${formatCurrency(totalCogs)}\n🔷 مجمل الربح: ${formatCurrency(grossProfit)}\n📕 المصاريف التشغيلية: ${formatCurrency(totalOperatingExpenses)}\n${netIncome >= 0 ? '✅' : '🔴'} صافي ${netIncome >= 0 ? 'الربح' : 'الخسارة'}: ${formatCurrency(Math.abs(netIncome))}\n📅 الفترة: من ${dateRange.from} إلى ${dateRange.to}`}
          />
          <div className="bg-slate-900 p-2 text-white max-md:p-1.5">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* 1. Revenues & COGS */}
      <div className="grid grid-cols-1 items-start gap-3 max-md:gap-3 md:grid-cols-2">
        <FinancialReportBlock
          title="الإيرادات (المبيعات)"
          icon={TrendingUp}
          data={revenues}
          total={totalRevenue}
          color="emerald"
        />
        <FinancialReportBlock
          title="تكلفة البضاعة المباعة (COGS)"
          icon={Package}
          data={cogsList}
          total={totalCogs}
          color="amber"
        />
      </div>

      {/* 2. Gross Profit Summary Bar */}
      <div
        className={cn(
          'flex flex-col items-center justify-between gap-3 border p-3.5 max-md:gap-2 max-md:p-3 md:flex-row',
          grossProfit >= 0
            ? 'border-blue-300 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20'
            : 'border-amber-300 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20'
        )}
      >
        <div className="flex items-center gap-3 max-md:gap-2">
          <div className="bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--app-text)]">مجمل الربح (Gross Profit)</h4>
            <p className="text-[10px] text-[var(--app-text-secondary)]">
              فارق المبيعات عن تكلفة شراء القطع
              {totalRevenue > 0 && (
                <span className="ms-1 font-mono font-bold text-blue-600 dark:text-blue-400">
                  ({((grossProfit / totalRevenue) * 100).toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        </div>
        <div
          dir="ltr"
          className={cn(
            'font-mono text-2xl font-bold tracking-tight max-md:text-xl',
            grossProfit >= 0
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          {formatCurrency(grossProfit)}
        </div>
      </div>

      {/* 3. Operating Expenses */}
      <div>
        <FinancialReportBlock
          title="المصاريف التشغيلية والإدارية (OPEX)"
          icon={TrendingDown}
          data={operatingExpensesList}
          total={totalOperatingExpenses}
          color="rose"
        />
      </div>

      {/* 4. Net Income Summary */}
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
