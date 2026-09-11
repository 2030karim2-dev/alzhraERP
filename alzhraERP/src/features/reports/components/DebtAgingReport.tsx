import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { reportsApi } from '../api';
import { formatCurrency, toBaseCurrency, formatLocalDate } from '../../../core/utils';
import { Clock, AlertTriangle, Users, ShieldCheck } from 'lucide-react';
import StatCard from '../../../ui/common/StatCard';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  MobileCard,
  MobileSectionTitle,
  ResponsiveGrid,
  MobileEmptyState,
} from './MobileComponents';

const AGING_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
const AGING_LABELS = ['حالية (0-30)', 'متأخرة (31-60)', 'متأخرة (61-90)', 'حرجة (90+)'];

/** صف أعمار الديون لكل جهة — يُعرض في الجدول. */
interface AgingPartyRow {
  id: string;
  name: string;
  type: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  total: number;
  oldestDate: string;
}

/** فاتورة غير مسددة — تُستهلك من `reportsApi.getDebtAgingInvoices`. */
const useDebtAging = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['debt_aging', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return null;

      // Get unpaid/partial invoices with party info
      const { data: invoices, error } = await reportsApi.getDebtAgingInvoices(user.company_id);

      if (error) throw error;

      const today = new Date();
      const agingBuckets = { current: 0, days30: 0, days60: 0, days90: 0 };
      const partyAging: Record<string, AgingPartyRow> = {};

      (invoices || []).forEach(inv => {
        // Aging is computed from the DUE date (accounting semantics),
        // not the issue date.
        const dueDate = new Date(inv.due_date || inv.issue_date);
        const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const remainingRaw = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        if (remainingRaw <= 0) return;

        const invWithCurrency = inv as unknown as {
          currency_code?: string | null;
          exchange_rate?: number | null;
        };
        const remaining = toBaseCurrency({
          amount: remainingRaw,
          currency_code: invWithCurrency.currency_code ?? null,
          exchange_rate: invWithCurrency.exchange_rate ?? null,
        });

        const partyId = inv.party_id ?? '';
        const partyName = inv.parties?.name || 'غير محدد';
        const partyType = inv.parties?.type || 'customer';

        if (!partyAging[partyId]) {
          partyAging[partyId] = {
            id: partyId,
            name: partyName,
            type: partyType,
            current: 0,
            days30: 0,
            days60: 0,
            days90: 0,
            total: 0,
            oldestDate: inv.due_date || inv.issue_date,
          };
        }

        if (daysDiff <= 30) {
          agingBuckets.current += remaining;
          partyAging[partyId].current += remaining;
        } else if (daysDiff <= 60) {
          agingBuckets.days30 += remaining;
          partyAging[partyId].days30 += remaining;
        } else if (daysDiff <= 90) {
          agingBuckets.days60 += remaining;
          partyAging[partyId].days60 += remaining;
        } else {
          agingBuckets.days90 += remaining;
          partyAging[partyId].days90 += remaining;
        }

        partyAging[partyId].total += remaining;
        const invoiceOldest = inv.due_date || inv.issue_date;
        if (invoiceOldest < partyAging[partyId].oldestDate) {
          partyAging[partyId].oldestDate = invoiceOldest;
        }
      });

      const partiesList = Object.values(partyAging).sort((a, b) => b.total - a.total);
      const totalOutstanding = partiesList.reduce((s, p) => s + p.total, 0);
      const criticalCount = partiesList.filter(p => p.days90 > 0).length;

      const chartData = [
        { name: AGING_LABELS[0], value: Math.max(0, agingBuckets.current) },
        { name: AGING_LABELS[1], value: Math.max(0, agingBuckets.days30) },
        { name: AGING_LABELS[2], value: Math.max(0, agingBuckets.days60) },
        { name: AGING_LABELS[3], value: Math.max(0, agingBuckets.days90) },
      ];

      return {
        agingBuckets,
        partiesList,
        totalOutstanding,
        criticalCount,
        chartData,
      };
    },
    enabled: !!user?.company_id,
  });
};

const DebtAgingReport: React.FC = () => {
  const { data, isLoading } = useDebtAging();

  const columns = useMemo(
    () => [
      {
        header: 'العميل',
        accessor: (row: AgingPartyRow) => (
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{row.name}</span>
            <span className="text-[11px] text-slate-400">
              أقدم استحقاق: {row.oldestDate ? formatLocalDate(row.oldestDate) : '—'}
            </span>
          </div>
        ),
      },
      {
        header: 'حالية',
        accessor: (row: AgingPartyRow) =>
          row.current > 0 ? (
            <span
              dir="ltr"
              className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400"
            >
              {formatCurrency(row.current)}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">—</span>
          ),
        width: '100px',
        align: 'center' as const,
      },
      {
        header: '31-60',
        accessor: (row: AgingPartyRow) =>
          row.days30 > 0 ? (
            <span
              dir="ltr"
              className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400"
            >
              {formatCurrency(row.days30)}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">—</span>
          ),
        width: '100px',
        align: 'center' as const,
      },
      {
        header: '61-90',
        accessor: (row: AgingPartyRow) =>
          row.days60 > 0 ? (
            <span
              dir="ltr"
              className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400"
            >
              {formatCurrency(row.days60)}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">—</span>
          ),
        width: '100px',
        align: 'center' as const,
      },
      {
        header: '90+',
        accessor: (row: AgingPartyRow) =>
          row.days90 > 0 ? (
            <span
              dir="ltr"
              className="rounded-md bg-rose-50 px-2 py-0.5 font-mono text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
            >
              {formatCurrency(row.days90)}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">—</span>
          ),
        width: '100px',
        align: 'center' as const,
      },
      {
        header: 'الإجمالي',
        accessor: (row: AgingPartyRow) => (
          <span
            dir="ltr"
            className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100"
          >
            {formatCurrency(row.total)}
          </span>
        ),
        width: '110px',
        align: 'center' as const,
      },
    ],
    []
  );

  if (isLoading)
    return (
      <div className="animate-pulse p-10 text-center text-sm text-slate-400">
        جاري تحليل أعمار الديون...
      </div>
    );

  const hasData = data && data.partiesList && data.partiesList.length > 0;

  return (
    <div className="animate-in fade-in space-y-4 duration-500">
      {/* Header */}
      <MobileSectionTitle
        title="تقرير أعمار الديون"
        icon={<Clock size={16} className="text-amber-600" />}
      />

      {/* Stats */}
      <ResponsiveGrid cols={4}>
        <StatCard
          title="إجمالي المستحقات"
          value={formatCurrency(data?.totalOutstanding || 0)}
          icon={Users}
          colorClass="text-blue-500"
          iconBgClass="bg-blue-500"
        />
        <StatCard
          title="حالية (0-30 يوم)"
          value={formatCurrency(data?.agingBuckets.current || 0)}
          icon={ShieldCheck}
          colorClass="text-emerald-500"
          iconBgClass="bg-emerald-500"
        />
        <StatCard
          title="متأخرة (31-90 يوم)"
          value={formatCurrency(
            (data?.agingBuckets.days30 || 0) + (data?.agingBuckets.days60 || 0)
          )}
          icon={AlertTriangle}
          colorClass="text-amber-500"
          iconBgClass="bg-amber-500"
        />
        <StatCard
          title="حرجة (90+ يوم)"
          value={formatCurrency(data?.agingBuckets.days90 || 0)}
          icon={AlertTriangle}
          colorClass="text-rose-500"
          iconBgClass="bg-rose-500"
        />
      </ResponsiveGrid>

      {/* Alert for critical debts */}
      {(data?.criticalCount || 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/20 sm:p-4">
          <AlertTriangle size={18} className="flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
            ⚠️ يوجد {data?.criticalCount} عميل لديهم ديون متأخرة أكثر من 90 يوم بإجمالي{' '}
            {formatCurrency(data?.agingBuckets.days90 || 0)}
          </span>
        </div>
      )}

      {!hasData && (
        <MobileEmptyState
          icon={<Clock size={48} />}
          title="لا توجد ديون مستحقة"
          description="لا توجد فواتير غير مدفوعة في الفترة الحالية"
        />
      )}

      {/* Chart */}
      {hasData && (data?.chartData || []).some(d => d.value > 0) && (
        <MobileCard padding="sm">
          <h4 className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            توزيع الديون حسب العمر
          </h4>
          <div className="h-[180px] w-full sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={data?.chartData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip
                  formatter={value => [formatCurrency(Number(value) || 0), 'المبلغ']}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} minPointSize={1}>
                  {data?.chartData.map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MobileCard>
      )}

      {/* Table */}
      {hasData && (
        <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-amber-500/5 p-3 dark:bg-amber-950/20 sm:p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Clock size={15} /> تفصيل أعمار الديون حسب العميل ({data?.partiesList.length || 0})
            </h4>
            <ShareButton
              size="sm"
              eventType="debt_aging"
              title="مشاركة تقرير أعمار الديون"
              message={`⏰ تقرير أعمار الديون\n━━━━━━━━━━━━━━\n💰 الإجمالي: ${formatCurrency(data?.totalOutstanding || 0)}\n✅ حالية: ${formatCurrency(data?.agingBuckets.current || 0)}\n⚠️ متأخرة (31-60): ${formatCurrency(data?.agingBuckets.days30 || 0)}\n🟠 متأخرة (61-90): ${formatCurrency(data?.agingBuckets.days60 || 0)}\n🔴 حرجة (90+): ${formatCurrency(data?.agingBuckets.days90 || 0)}\n📅 التاريخ: ${formatLocalDate(new Date())}`}
            />
          </div>
          <div className="overflow-x-auto">
            <ExcelTable
              columns={columns}
              data={data?.partiesList || []}
              colorTheme="orange"
              isRTL
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtAgingReport;
