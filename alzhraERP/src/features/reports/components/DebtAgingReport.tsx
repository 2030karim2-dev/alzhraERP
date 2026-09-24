/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { formatCurrency, formatLocalDate } from '../../../core/utils';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';
import { MobileSectionTitle, MobileEmptyState } from './MobileComponents';
import { useDebtAging } from '../hooks/useDebtAging';
import { DebtAgingStats } from './DebtAgingStats';
import { DebtAgingChart } from './DebtAgingChart';
import { getDebtAgingColumns } from './debtAgingColumns';

const DebtAgingReport: React.FC = () => {
  const { data, isLoading } = useDebtAging();
  const columns = useMemo(() => getDebtAgingColumns(), []);

  if (isLoading) {
    return (
      <div className="animate-pulse p-10 text-center text-sm text-slate-400">
        جاري تحليل أعمار الديون...
      </div>
    );
  }

  const hasData = Boolean(data?.partiesList && data.partiesList.length > 0);

  return (
    <div className="animate-in fade-in space-y-4 duration-500">
      <MobileSectionTitle
        title="تقرير أعمار الديون"
        icon={<Clock size={16} className="text-amber-600" />}
      />

      {/* KPI Stats & Alert */}
      <DebtAgingStats data={data} />

      {!hasData && (
        <MobileEmptyState
          icon={<Clock size={48} />}
          title="لا توجد ديون مستحقة"
          description="لا توجد فواتير غير مدفوعة في الفترة الحالية"
        />
      )}

      {/* Aging Distribution Chart */}
      {hasData && <DebtAgingChart chartData={data?.chartData || []} />}

      {/* Detailed Customer Aging Table */}
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
