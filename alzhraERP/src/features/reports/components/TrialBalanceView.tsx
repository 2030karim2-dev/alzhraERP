
import React from 'react';
import { useTrialBalance } from '../hooks';
import ExcelTable from '../../../ui/common/ExcelTable';
import { formatCurrency } from '../../../core/utils';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import ShareButton from '../../../ui/common/ShareButton';
import { cn } from '../../../core/utils';

const TrialBalanceView: React.FC = () => {
  const { data, isLoading } = useTrialBalance();

  if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold tracking-widest">تحميل ميزان المراجعة الذكي...</div>;

  const columns = [
    { header: 'كود الحساب', accessor: (row: any) => <span className="font-mono text-[10px] text-blue-600 font-bold">{row.code}</span>, width: 'w-24' },
    { header: 'اسم الحساب المحاسبي', accessor: (row: any) => <span className="font-bold text-slate-700 dark:text-slate-100">{row.name}</span> },
    { header: 'إجمالي المدين', accessor: (row: any) => <span dir="ltr" className="font-mono font-bold text-emerald-600">{formatCurrency(row.totalDebit)}</span>, className: 'text-left bg-emerald-500/5' },
    { header: 'إجمالي الدائن', accessor: (row: any) => <span dir="ltr" className="font-mono font-bold text-rose-600">{formatCurrency(row.totalCredit)}</span>, className: 'text-left bg-rose-500/5' },
    {
      header: 'الرصيد الصافي',
      accessor: (row: any) => (
        <span dir="ltr" className={cn("flex items-center gap-1 text-[10px] font-bold", row.netBalance >= 0 ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full" : "text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full")}>
          <span>{row.netBalance >= 0 ? 'مدين' : 'دائن'}</span>
          <span className="font-mono">{formatCurrency(Math.abs(row.netBalance))}</span>
        </span>
      ),
      className: 'text-left font-bold bg-slate-50 dark:bg-slate-800'
    },
  ];

  const totalDr = data?.reduce((s: number, r: any) => s + r.totalDebit, 0) || 0;
  const totalCr = data?.reduce((s: number, r: any) => s + r.totalCredit, 0) || 0;
  const diff = Math.abs(totalDr - totalCr);
  const isBalanced = diff < 0.1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Dynamic Status Banner */}
      <div className={cn(
        "glass-panel bento-item p-6 flex flex-col md:flex-row items-center justify-between border-none shadow-xl relative overflow-hidden",
        isBalanced ? "bg-emerald-500/5 dark:bg-emerald-500/10" : "bg-rose-500/5 dark:bg-rose-500/10"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-1 h-full",
          isBalanced ? "bg-emerald-500" : "bg-rose-500"
        )} />

        <div className="flex items-center gap-5 relative z-10">
          <div className={cn(
            "p-4 rounded-2xl shadow-lg transition-transform hover:scale-110",
            isBalanced ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-rose-500 text-white shadow-rose-500/30"
          )}>
            {isBalanced ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          </div>
          <div>
            <h4 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">{isBalanced ? 'الميزان متزن حاسوبياً' : 'يوجد تباين في مراجعة الميزان'}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isBalanced ? 'تطابق تام بين الحركات المدينة والدائنة' : `فارق مالي قدره ${diff.toLocaleString()} ريال`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-6 md:mt-0 relative z-10">
          <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-6 h-10 flex flex-col justify-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">التباين الفعلي</p>
            <p dir="ltr" className={cn("text-xl font-bold font-mono tracking-tighter", isBalanced ? "text-emerald-500" : "text-rose-600")}>
              {formatCurrency(diff)}
            </p>
          </div>
          <ShareButton
            size="md"
            showLabel
            eventType="trial_balance"
            title="مشاركة ميزان المراجعة"
            className="bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm transition-all"
            message={`⚖️ ميزان المراجعة الذكي - الزهراء سمارت\n━━━━━━━━━━━━━━\n📊 الحالة: ${isBalanced ? '✅ متزن تماماً' : '❌ غير متزن'}\n📗 إجمالي المدين: ${formatCurrency(totalDr)}\n📕 إجمالي الدائن: ${formatCurrency(totalCr)}\n📐 التباين: ${formatCurrency(diff)}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}`}
          />
        </div>
      </div>

      <div className="glass-card bento-item overflow-hidden shadow-2xl border-none">
        <ExcelTable columns={columns} data={data || []} colorTheme="blue" />

        {/* Simplified Summary Footer */}
        <div className="p-6 bg-slate-900 dark:bg-slate-900/40 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-emerald-500 via-transparent to-rose-500 opacity-30" />
          <div className="flex items-center gap-2 z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.2em]">ملخص الأرصدة الختامية</span>
          </div>

          <div className="flex gap-10 z-10">
            <div className="text-left">
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block opacity-70 mb-1">إجمالي المدين</span>
              <span dir="ltr" className="text-lg font-bold font-mono text-emerald-400 tracking-tighter">{formatCurrency(totalDr)}</span>
            </div>
            <div className="text-left border-r border-slate-700/50 pr-10">
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block opacity-70 mb-1">إجمالي الدائن</span>
              <span dir="ltr" className="text-lg font-bold font-mono text-rose-400 tracking-tighter">{formatCurrency(totalCr)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialBalanceView;
