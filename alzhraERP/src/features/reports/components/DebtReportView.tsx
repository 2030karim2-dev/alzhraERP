
import React from 'react';
import { useDebtReport } from '../hooks';
import { formatCurrency } from '../../../core/utils';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import ShareButton from '../../../ui/common/ShareButton';
import ExcelTable from '../../../ui/common/ExcelTable';
import { cn } from '../../../core/utils';
import { MobileCard, ResponsiveGrid } from './MobileComponents';

const DebtReportView: React.FC = () => {
  const { data, isLoading } = useDebtReport();

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20  max-md:p-6   max-md:gap-4">
      <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-slate-400 font-bold tracking-widest animate-pulse uppercase text-[10px]">جاري مراجعة ذمم العملاء والموردين...</p>
    </div>
  );

  const receivables = data?.debts.filter(d => d.type === 'customer' && d.remaining_amount > 0) || [];
  const payables = data?.debts.filter(d => d.type === 'supplier' && d.remaining_amount < 0) || [];
  const netPosition = (data?.summary?.receivables || 0) - (data?.summary?.payables || 0);

  const columns = [
    { header: 'الجهة المالية', accessor: (row: any) => <span className="font-bold text-slate-700 dark:text-slate-100">{row.name}</span> },
    {
      header: 'الفئة', accessor: (row: any) => (
        <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight", row.type === 'customer' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20')}>
          {row.type === 'customer' ? 'عميل' : 'مورد'}
        </span>
      ), width: '100px', align: 'center' as const
    },
    { header: 'الرصيد المتبقي', accessor: (row: any) => <span dir="ltr" className={cn("font-bold font-mono text-sm px-4 py-1.5 rounded-2xl max-md:rounded-xl", row.remaining_amount > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 ring-1 ring-emerald-500/20' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 ring-1 ring-rose-500/20')}>{formatCurrency(Math.abs(row.remaining_amount))}</span>, className: 'text-left' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">

      {/* High-Impact Summary Grid */}
      <ResponsiveGrid cols={3}>
        <MobileCard padding="lg" className="bg-emerald-500/5 dark:bg-emerald-950/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0   max-md:p-3 sm:p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <TrendingUp size={60} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider mb-2 sm:mb-3">إجمالي مديونيات العملاء</p>
          <h3 dir="ltr" className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tighter italic">
            {formatCurrency(data?.summary.receivables || 0)}
          </h3>
          <div className="flex items-center   max-md:gap-2 text-[10px] text-slate-400 font-bold mt-2">
            <Users size={12} />
            <span>{receivables.length} مطالبة نشطة</span>
          </div>
        </MobileCard>

        <MobileCard padding="lg" className="bg-rose-500/5 dark:bg-rose-950/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0   max-md:p-3 sm:p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <TrendingDown size={60} className="text-rose-500" />
          </div>
          <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-wider mb-2 sm:mb-3">ديون مستحقة للموردين</p>
          <h3 dir="ltr" className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tighter italic">
            {formatCurrency(data?.summary.payables || 0)}
          </h3>
          <div className="flex items-center   max-md:gap-2 text-[10px] text-slate-400 font-bold mt-2">
            <Users size={12} />
            <span>{payables.length} فاتورة التزام</span>
          </div>
        </MobileCard>

        <MobileCard padding="lg" className={cn("relative overflow-hidden group", netPosition >= 0 ? "bg-blue-500 text-white" : "bg-slate-900 text-white")}>
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-all duration-1000" />
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-2 sm:mb-3">صافي المركز المالي</p>
          <h3 dir="ltr" className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tighter italic">
            {formatCurrency(Math.abs(netPosition))}
          </h3>
          <div className="flex items-center   max-md:gap-2 mt-2 sm:mt-3">
            <span className={cn("px-2 sm:px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-white/20 backdrop-blur-md border border-white/10")}>
              {netPosition >= 0 ? 'فائض مستحق' : 'عجز ملتزم'}
            </span>
            <ShareButton
              size="md"
              eventType="debt_report"
              title="مشاركة المركز"
              className="bg-white/20 hover:bg-white/30 text-white rounded-xl   max-md:p-2 sm:p-2.5 transition-all"
              message={`📊 تقرير المركز المالي - الزهراء سمارت\n━━━━━━━━━━━━━━\n✅ مستحقات (عملاء): ${formatCurrency(data?.summary.receivables || 0)}\n🔴 التزامات (موردين): ${formatCurrency(data?.summary.payables || 0)}\n📊 صافي المركز: ${formatCurrency(Math.abs(netPosition))} ${netPosition >= 0 ? '(لصالحك)' : '(عليك)'}`}
            />
          </div>
        </MobileCard>
      </ResponsiveGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2   max-md:gap-4 sm:gap-6">
        {/* Receivables Details */}
        <MobileCard padding="none">
          <div className="  max-md:p-3 sm:p-4 lg:p-6 flex items-center justify-between border-b dark:border-slate-800">
            <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center   max-md:gap-2 sm:gap-3">
              <div className="  max-md:p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                <TrendingUp size={16} />
              </div>
              كشف مستحقات العملاء
            </h4>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{receivables.length} عميل</span>
          </div>
          <div className="overflow-x-auto">
            <ExcelTable columns={columns} data={receivables} colorTheme="green" />
          </div>
        </MobileCard>

        {/* Payables Details */}
        <MobileCard padding="none">
          <div className="  max-md:p-3 sm:p-4 lg:p-6 flex items-center justify-between border-b dark:border-slate-800">
            <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center   max-md:gap-2 sm:gap-3">
              <div className="  max-md:p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20">
                <TrendingDown size={16} />
              </div>
              كشف التزامات الموردين
            </h4>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{payables.length} مورد</span>
          </div>
          <div className="overflow-x-auto">
            <ExcelTable columns={columns} data={payables} colorTheme="orange" />
          </div>
        </MobileCard>
      </div>
    </div>
  );
};

export default DebtReportView;