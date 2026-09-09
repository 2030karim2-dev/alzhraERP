import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { reportsApi } from '../api';
import { formatCurrency, cn, formatLocalDate } from '../../../core/utils';
import {
  Wallet,
  TrendingDown,
  PieChart as PieIcon,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import StatCard from '../../../ui/common/StatCard';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';
import { MobileCard, MobileSectionTitle, ResponsiveGrid } from './MobileComponents';

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#14b8a6',
];

/** صف مصروف مجمّع حسب الحساب (عرض الجدول). */
interface ExpenseAccountRow {
  id: string;
  name: string;
  code: string;
  total: number;
  count: number;
  percentage?: number;
}

const useOperationalExpenses = (days = 30) => {
  /** سطر قيد خام من استعلام المصاريف التشغيلية. */
  interface OperationalExpenseLine {
    account?: { id: string; name_ar?: string | null; code?: string | null } | null;
    debit_amount?: number | null;
    credit_amount?: number | null;
  }

  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['operational_expenses', user?.company_id, days],
    queryFn: async () => {
      if (!user?.company_id) return null;

      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

      // Get all expense journal lines with their accounts
      const { data: lines, error } = await reportsApi.getOperationalExpensesLines(
        user.company_id,
        formatLocalDate(fromDate)
      );

      if (error) throw error;

      // Group by account
      const accountMap: Record<
        string,
        { name: string; code: string; total: number; count: number }
      > = {};
      (lines || []).forEach((line: OperationalExpenseLine) => {
        const accountCode = line.account?.code || '';
        // استبعاد تكلفة البضاعة المباعة (COGS) من المصاريف التشغيلية
        if (accountCode.startsWith('51') || accountCode === '5100') return;

        const accountId = line.account?.id ?? '';
        const accountName = line.account?.name_ar || 'غير محدد';

        if (!accountMap[accountId]) {
          accountMap[accountId] = { name: accountName, code: accountCode, total: 0, count: 0 };
        }
        accountMap[accountId].total +=
          Number(line.debit_amount || 0) - Number(line.credit_amount || 0);
        accountMap[accountId].count += 1;
      });

      const expensesByAccount = Object.entries(accountMap)
        .map(([id, data]) => ({ id, ...data }))
        .filter(a => a.total > 0)
        .sort((a, b) => b.total - a.total);

      const totalExpenses = expensesByAccount.reduce((s, a) => s + a.total, 0);

      // Pie chart data
      const chartData = expensesByAccount.slice(0, 8).map((a, i) => ({
        name: a.name,
        value: Math.abs(a.total),
        fill: COLORS[i % COLORS.length] || '#ef4444',
      }));

      // If there are more than 8, group the rest as "أخرى"
      if (expensesByAccount.length > 8) {
        const otherTotal = expensesByAccount.slice(8).reduce((s, a) => s + a.total, 0);
        chartData.push({ name: 'أخرى', value: Math.abs(otherTotal), fill: '#94a3b8' });
      }

      return {
        expensesByAccount,
        totalExpenses,
        chartData,
        transactionCount: (lines || []).length,
      };
    },
    enabled: !!user?.company_id,
  });
};

const OperationalExpensesReport: React.FC = () => {
  const [days, setDays] = useState(30);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading } = useOperationalExpenses(days);

  const columns = useMemo(
    () => [
      {
        header: 'كود الحساب',
        accessor: (row: ExpenseAccountRow) => (
          <span className="font-mono text-[10px] text-gray-400">{row.code}</span>
        ),
        width: '80px',
      },
      {
        header: 'اسم المصروف',
        accessor: (row: ExpenseAccountRow) => (
          <span className="text-[10px] font-bold text-gray-800 dark:text-slate-100">
            {row.name}
          </span>
        ),
      },
      {
        header: 'عدد الحركات',
        accessor: (row: ExpenseAccountRow) => (
          <span className="text-[10px] text-gray-500">{row.count}</span>
        ),
        width: '80px',
        align: 'center' as const,
      },
      {
        header: 'الإجمالي',
        accessor: (row: ExpenseAccountRow) => (
          // [FIX] لا Math.abs — total = debit - credit للحساب (موجب بعد الفلترة).
          // Math.abs كانت تخفي أي قيم سالبة غير متوقعة وتحوّلها لمصاريف مضافة.
          <span
            dir="ltr"
            className={`font-mono text-[10px] font-bold ${
              row.total < 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {row.total < 0 ? '(' : ''}
            {formatCurrency(Math.abs(row.total))}
            {row.total < 0 ? ')' : ''}
          </span>
        ),
        width: '120px',
        align: 'center' as const,
      },
      {
        header: 'النسبة',
        accessor: (row: ExpenseAccountRow) => {
          // [FIX] لا Math.abs في حساب النسبة — استخدم القيمة الحقيقية.
          // إذا كانت totalExpenses صحيحة والصف موجب، النسبة صحيحة بدون abs.
          const pct = data?.totalExpenses ? (row.total / data.totalExpenses) * 100 : 0;
          return (
            <div className="flex items-center max-md:gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-rose-500"
                  style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                />
              </div>
              <span className="w-10 text-left text-[10px] font-bold text-gray-500">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        },
        width: '130px',
      },
    ],
    [data?.totalExpenses]
  );

  if (isLoading)
    return (
      <div className="animate-pulse p-10 text-center text-sm text-slate-400 max-md:p-5">
        جاري تحليل المصروفات التشغيلية...
      </div>
    );

  const displayExpenses = showAll ? data?.expensesByAccount : data?.expensesByAccount.slice(0, 10);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-500">
      {/* Header */}
      <MobileSectionTitle
        title="تقرير المصاريف التشغيلية"
        icon={<Wallet size={16} className="text-rose-600" />}
      />
      <div className="no-scrollbar -mx-1 flex overflow-x-auto px-1 pb-1 max-md:gap-1">
        {[7, 14, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => {
              setDays(d);
            }}
            className={cn(
              'min-h-[36px] flex-shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all active:scale-95 sm:min-h-[40px] sm:px-3 sm:py-2 sm:text-xs',
              days === d
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800'
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Stats */}
      <ResponsiveGrid cols={3}>
        <StatCard
          title={`إجمالي المصروفات (${days} يوم)`}
          value={formatCurrency(data?.totalExpenses || 0)}
          icon={TrendingDown}
          colorClass="text-rose-500"
          iconBgClass="bg-rose-500"
        />
        <StatCard
          title="عدد الحركات"
          value={String(data?.transactionCount || 0)}
          icon={Calendar}
          colorClass="text-amber-500"
          iconBgClass="bg-amber-500"
        />
        <StatCard
          title="عدد أنواع المصروفات"
          value={String(data?.expensesByAccount.length || 0)}
          icon={PieIcon}
          colorClass="text-indigo-500"
          iconBgClass="bg-indigo-500"
        />
      </ResponsiveGrid>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 max-md:gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Pie Chart */}
        {(data?.chartData.length || 0) > 0 && (
          <MobileCard padding="sm" className="lg:col-span-1">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:mb-3 sm:text-xs">
              توزيع المصروفات
            </h4>
            <div className="h-[180px] w-full sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={180}>
                <PieChart>
                  <Pie
                    data={data?.chartData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {data?.chartData.map((entry: { fill: string }, i: number) => (
                      <Cell key={i} fill={entry.fill || '#ef4444'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={value => formatCurrency(Number(value) || 0)}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </MobileCard>
        )}

        {/* Table */}
        <MobileCard
          padding="none"
          className={cn('lg:col-span-2', (data?.chartData.length || 0) === 0 && 'lg:col-span-3')}
        >
          <div className="flex items-center justify-between border-b bg-rose-50/50 dark:border-slate-800 dark:bg-rose-950/20 max-md:p-3 sm:p-4">
            <h4 className="flex items-center text-[10px] font-bold uppercase text-rose-600 max-md:gap-2 sm:text-xs">
              <Wallet size={12} /> تفصيل المصروفات ({data?.expensesByAccount.length || 0})
            </h4>
            <ShareButton
              size="sm"
              eventType="expenses_report"
              title="مشاركة تقرير المصاريف"
              message={`💰 تقرير المصاريف التشغيلية\n━━━━━━━━━━━━━━\n📊 إجمالي المصروفات (${days} يوم): ${formatCurrency(data?.totalExpenses || 0)}\n📋 عدد الأنواع: ${data?.expensesByAccount.length || 0}\n\n أعلى المصروفات:\n${(data?.expensesByAccount.slice(0, 5) || []).map((e: ExpenseAccountRow, i: number) => `${i + 1}. ${e.name}: ${formatCurrency(Math.abs(e.total))}`).join('\n')}`}
            />
          </div>
          <div className="overflow-x-auto">
            <ExcelTable columns={columns} data={displayExpenses || []} colorTheme="orange" isRTL />
          </div>
          {(data?.expensesByAccount.length || 0) > 10 && (
            <button
              onClick={() => {
                setShowAll(!showAll);
              }}
              className="flex w-full items-center justify-center border-t text-center text-[10px] font-bold text-rose-600 transition-all hover:bg-rose-50 active:scale-[0.98] dark:border-slate-800 dark:hover:bg-rose-950/30 max-md:gap-1 max-md:p-2 sm:p-3 sm:text-xs"
            >
              {showAll ? (
                <>
                  <ChevronUp size={12} /> إخفاء
                </>
              ) : (
                <>
                  <ChevronDown size={12} /> عرض الكل ({data?.expensesByAccount.length})
                </>
              )}
            </button>
          )}
        </MobileCard>
      </div>
    </div>
  );
};

export default OperationalExpensesReport;
