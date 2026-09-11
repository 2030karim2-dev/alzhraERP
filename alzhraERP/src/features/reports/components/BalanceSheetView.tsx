import React from 'react';
import { useBalanceSheet } from '../hooks';
import { formatCurrency, cn, formatLocalDate } from '../../../core/utils';
import { Landmark, Scale, ShieldCheck, Wallet, Layers, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ShareButton from '../../../ui/common/ShareButton';

/** بند في الميزانية العمومية (أصول/خصوم/حقوق ملكية) كما يعيده `useBalanceSheet`. */
interface BalanceItem {
  id?: string;
  code?: string;
  name: string;
  netBalance: number;
}

interface ReportSectionProps {
  title: string;
  items: BalanceItem[];
  total: number;
  icon: LucideIcon;
  color: 'blue' | 'rose' | 'emerald';
}

const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  items,
  total,
  icon: Icon,
  color,
}) => {
  const theme = {
    blue: {
      header: 'bg-blue-500/10 text-blue-600 border-blue-200/20 dark:border-blue-900/30',
      dot: 'bg-blue-400',
    },
    rose: {
      header: 'bg-rose-500/10 text-rose-600 border-rose-200/20 dark:border-rose-900/30',
      dot: 'bg-rose-400',
    },
    emerald: {
      header: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/20 dark:border-emerald-900/30',
      dot: 'bg-emerald-400',
    },
  };
  const currentTheme = theme[color];

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div
        className={cn(
          'flex items-center justify-between border-b p-3 sm:p-3.5',
          currentTheme.header
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-white/60 p-1.5 shadow-sm dark:bg-slate-800">
            <Icon size={16} />
          </div>
          <h3 className="text-xs font-bold">{title}</h3>
        </div>
        <span className="rounded-full bg-white/40 px-2 py-0.5 text-[10px] font-bold opacity-75 dark:bg-slate-800/40">
          {items.length} بند
        </span>
      </div>
      <div className="flex-1 space-y-2 p-3 sm:p-3.5">
        {items.map(item => (
          <div
            key={item.code}
            className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
          >
            <div className="flex items-center gap-2">
              <div className={cn('h-1.5 w-1.5 rounded-full', currentTheme.dot)} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {item.name}
              </span>
            </div>
            <span
              dir="ltr"
              className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              {formatCurrency(Math.abs(item.netBalance))}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3 sm:p-3.5">
        <span className="text-xs font-bold text-slate-500">إجمالي القسم</span>
        <span
          dir="ltr"
          className={cn(
            'font-mono text-base font-bold tracking-tight',
            color === 'blue'
              ? 'text-blue-600 dark:text-blue-400'
              : color === 'rose'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
};

const BalanceSheetView: React.FC = () => {
  const { data, isLoading } = useBalanceSheet();

  if (isLoading)
    return (
      <div className="animate-pulse p-12 text-center text-xs font-bold text-slate-400">
        جاري صياغة المركز المالي...
      </div>
    );

  if (!data)
    return (
      <div className="p-8 text-center text-xs font-bold text-slate-500">
        لا توجد بيانات مالية متاحة حالياً
      </div>
    );

  const { assets, liabilities, equity, totalAssets, totalLiabEquity } = data;
  const isBalanced = Math.abs(totalAssets - totalLiabEquity) < 1;
  const reportDate = formatLocalDate(new Date());

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-[1400px] space-y-4 pb-6 duration-700">
      {/* Header Card */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm sm:flex-row sm:items-center sm:p-4">
        <div className="text-right">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Landmark size={18} />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              قائمة المركز المالي
            </h2>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Clock size={12} />
            <span>تقرير مالي ختامي كما في:</span>
            <b dir="ltr" className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {reportDate}
            </b>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden border-l border-[var(--app-border)] pl-4 text-left sm:block">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              صافي الأصول
            </p>
            <p dir="ltr" className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAssets)}
            </p>
          </div>
          <ShareButton
            size="md"
            showLabel
            eventType="balance_sheet"
            title="مشاركة الميزانية العمومية"
            className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
            message={`🏦 الميزانية العمومية (المركز المالي) - الزهراء سمارت\n━━━━━━━━━━━━━━\n💼 إجمالي الأصول: ${formatCurrency(totalAssets)}\n📋 إجمالي الخصوم: ${formatCurrency(Math.abs(liabilities.reduce((s: number, a: BalanceItem) => s + a.netBalance, 0)))}\n🏛️ حقوق الملكية: ${formatCurrency(Math.abs(equity.reduce((s: number, a: BalanceItem) => s + a.netBalance, 0)))}\n${isBalanced ? '✅ الميزانية متزنة' : `❌ غير متزنة - الفرق: ${formatCurrency(Math.abs(totalAssets - totalLiabEquity))}`}\n📅 التاريخ: ${reportDate}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Left Column: Assets */}
        <ReportSection
          title="الأصول (المتداولة وغير المتداولة)"
          icon={Wallet}
          items={assets}
          total={totalAssets}
          color="blue"
        />

        {/* Right Column: Liabilities & Equity */}
        <div className="space-y-4">
          <ReportSection
            title="الالتزامات والخصوم"
            icon={Scale}
            items={liabilities}
            total={Math.abs(liabilities.reduce((s: number, a: BalanceItem) => s + a.netBalance, 0))}
            color="rose"
          />
          <ReportSection
            title="حقوق الملكية والأرباح"
            icon={Layers}
            items={equity}
            total={Math.abs(equity.reduce((s: number, a: BalanceItem) => s + a.netBalance, 0))}
            color="emerald"
          />
        </div>
      </div>

      {/* Verification Footer */}
      <div
        className={cn(
          'flex flex-col items-center justify-between gap-3 rounded-xl border p-3.5 shadow-sm sm:flex-row sm:p-4',
          isBalanced
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300'
            : 'border-rose-500/20 bg-rose-500/5 text-rose-800 dark:text-rose-300'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-lg p-2 text-white',
              isBalanced ? 'bg-emerald-600' : 'bg-rose-600'
            )}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold">تحقق المعادلة المحاسبية</h4>
            <p className="mt-0.5 text-xs opacity-75">
              {isBalanced
                ? 'المعادلة متزنة تماماً (الأصول = الخصوم + حقوق الملكية)'
                : `يوجد تباين محاسبي قدره ${formatCurrency(Math.abs(totalAssets - totalLiabEquity))}`}
            </p>
          </div>
        </div>

        <div className="rounded-full border px-3 py-1 text-xs font-bold">
          <span>{isBalanced ? 'الميزانية متزنة' : 'يوجد فارق محاسبي'}</span>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetView;
