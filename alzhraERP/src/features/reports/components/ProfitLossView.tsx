
import React, { useState } from 'react';
import { useProfitAndLoss } from '../hooks';
import { formatCurrency } from '../../../core/utils';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../core/utils';
import ShareButton from '../../../ui/common/ShareButton';

const ProfitLossView: React.FC = () => {
   const { data, isLoading } = useProfitAndLoss();
   const [showAllRevenues, setShowAllRevenues] = useState(false);
   const [showAllExpenses, setShowAllExpenses] = useState(false);

   if (isLoading) return <div className="p-20 text-center animate-pulse">جاري تحليل الأداء المالي...</div>;

   const isProfit = data?.netProfit! >= 0;
   const totalRevenues = data?.revenues.reduce((s: number, r: any) => s + Math.abs(r.netBalance), 0) || 0;
   const totalExpenses = data?.expenses.reduce((s: number, r: any) => s + Math.abs(r.netBalance), 0) || 0;

   const displayedRevenues = showAllRevenues ? data?.revenues : data?.revenues.slice(0, 5);
   const displayedExpenses = showAllExpenses ? data?.expenses : data?.expenses.slice(0, 5);

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
         {/* Premium Hero Stat Card */}
         <div className={cn(
            "glass-card bento-item p-10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between border-none shadow-2xl",
            isProfit ? "bg-emerald-500/5 dark:bg-emerald-500/10" : "bg-rose-500/5 dark:bg-rose-500/10"
         )}>
            {/* Animated Background Elements */}
            <div className={cn(
               "absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] -mr-32 -mt-32 opacity-20",
               isProfit ? "bg-emerald-400" : "bg-rose-400"
            )} />
            <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-20" />

            <div className="relative z-10 flex items-center gap-6">
               <div className={cn(
                  "p-5 rounded-3xl shadow-xl transition-transform hover:rotate-12 duration-500",
                  isProfit ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-rose-500 text-white shadow-rose-500/30"
               )}>
                  <DollarSign size={32} />
               </div>
               <div>
                  <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-2">
                     {isProfit ? 'صافي أرباح المنشأة' : 'صافي خسائر المنشأة'}
                  </h2>
                  <div className="flex items-baseline gap-2">
                     <p className={cn(
                        "text-5xl font-bold tracking-tighter number-reveal font-mono",
                        isProfit ? "stat-value-profit" : "stat-value-loss"
                     )}>
                        {formatCurrency(Math.abs(data?.netProfit || 0))}
                     </p>
                     <span className="text-xs font-bold text-slate-400">ريال</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                     <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isProfit ? "bg-emerald-500" : "bg-rose-500")} />
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <TrendingUp size={12} className={isProfit ? "text-emerald-500" : "text-rose-500"} />
                        تحديث مالي لحظي للنظام المحاسبي
                     </p>
                  </div>
               </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-4 mt-8 md:mt-0 relative z-10">
               <div className="flex items-center gap-3">
                  <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">نسبة الأداء</p>
                     <p className={cn("text-lg font-bold font-mono", isProfit ? "text-emerald-500" : "text-rose-500")}>
                        {isProfit ? '+' : '-'}{(totalRevenues > 0 ? (Math.abs(data?.netProfit || 0) / totalRevenues * 100).toFixed(1) : 0)}%
                     </p>
                  </div>
                  <ShareButton
                     size="md"
                     eventType="profit_loss"
                     title="مشاركة تقرير الأداء المالي"
                     className="bg-white/10 hover:bg-white/20 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-white/20 dark:border-slate-700/50 rounded-2xl p-4 transition-all"
                     message={`📊 تقرير الأرباح والخسائر - الزهراء سمارت\n━━━━━━━━━━━━━━\n📗 إجمالي الإيرادات: ${formatCurrency(totalRevenues)}\n📕 إجمالي المصروفات: ${formatCurrency(totalExpenses)}\n${isProfit ? '✅' : '🔴'} صافي ${isProfit ? 'الربح' : 'الخسارة'}: ${formatCurrency(Math.abs(data?.netProfit || 0))}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}`}
                  />
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenues Layout */}
            <div className="glass-card bento-item flex flex-col shadow-xl">
               <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 border-b border-emerald-100 dark:border-emerald-900/20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                        <TrendingUp size={16} />
                     </div>
                     <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">تحليل الإيرادات</span>
                  </div>
                  <span dir="ltr" className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(data?.totalRevenues || 0)}</span>
               </div>
               <div className="p-6 space-y-4 flex-1">
                  {displayedRevenues?.map((rev: { id: string; name: string; netBalance: number }) => (
                     <div key={rev.id} className="group flex justify-between items-center p-3 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/20">
                        <div className="flex items-center gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 group-hover:scale-150 transition-transform" />
                           <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{rev.name}</span>
                        </div>
                        <span dir="ltr" className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{formatCurrency(Math.abs(rev.netBalance))}</span>
                     </div>
                  ))}
               </div>
               {(data?.revenues.length || 0) > 5 && (
                  <div className="p-4 border-t border-slate-50 dark:border-slate-800/50">
                     <button
                        onClick={() => setShowAllRevenues(!showAllRevenues)}
                        className="w-full text-center text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center justify-center gap-2"
                     >
                        {showAllRevenues ? <><ChevronUp size={14} /> عرض ملخص</> : <><ChevronDown size={14} /> عرض التفاصيل ({data?.revenues.length})</>}
                     </button>
                  </div>
               )}
            </div>

            {/* Expenses Layout */}
            <div className="glass-card bento-item flex flex-col shadow-xl">
               <div className="bg-rose-50/50 dark:bg-rose-900/10 p-5 border-b border-rose-100 dark:border-rose-900/20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600">
                        <TrendingDown size={16} />
                     </div>
                     <span className="text-[10px] font-bold text-rose-600 uppercase tracking-[0.2em]">تحليل المصاريف</span>
                  </div>
                  <span dir="ltr" className="text-sm font-bold font-mono text-rose-700 dark:text-rose-400">{formatCurrency(data?.totalExpenses || 0)}</span>
               </div>
               <div className="p-6 space-y-4 flex-1">
                  {displayedExpenses?.map((exp: { id: string; name: string; netBalance: number }) => (
                     <div key={exp.id} className="group flex justify-between items-center p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/20">
                        <div className="flex items-center gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-rose-300 group-hover:scale-150 transition-transform" />
                           <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{exp.name}</span>
                        </div>
                        <span dir="ltr" className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{formatCurrency(Math.abs(exp.netBalance))}</span>
                     </div>
                  ))}
               </div>
               {(data?.expenses.length || 0) > 5 && (
                  <div className="p-4 border-t border-slate-50 dark:border-slate-800/50">
                     <button
                        onClick={() => setShowAllExpenses(!showAllExpenses)}
                        className="w-full text-center text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors flex items-center justify-center gap-2"
                     >
                        {showAllExpenses ? <><ChevronUp size={14} /> عرض ملخص</> : <><ChevronDown size={14} /> عرض التفاصيل ({data?.expenses.length})</>}
                     </button>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default ProfitLossView;