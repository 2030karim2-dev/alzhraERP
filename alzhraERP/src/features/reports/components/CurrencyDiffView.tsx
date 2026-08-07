
import React from 'react';
import { useCurrencyDiffs } from '../hooks';
import { formatCurrency } from '../../../core/utils';
import { RefreshCw, Info, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';
import { MobileCard, MobileSectionTitle } from './MobileComponents';

const CurrencyDiffView: React.FC = () => {
  const { data, isLoading } = useCurrencyDiffs();

   if (isLoading) {
     return (
       <div className="flex flex-col items-center justify-center p-8 sm:p-12 gap-3 sm:gap-4">
         <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 border-3 sm:border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin shadow-lg shadow-indigo-500/20" />
         <p className="text-xs sm:text-sm text-slate-400 font-bold">جاري جرد أرصدة العملات الأجنبية...</p>
       </div>
     );
   }

   const totalDiff = data?.reduce((s: number, a: any) => s + a.unrealizedGain, 0) || 0;

   const columns = [
     {
       header: 'الحساب المالي',
       accessor: (row: any) => (
         <div className="flex flex-col gap-1">
           <span className="font-black text-slate-800 dark:text-white tracking-tight text-xs sm:text-sm">{row.name}</span>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{row.account_type || 'Asset'}</span>
         </div>
       )
     },
     {
       header: 'كود العملة',
       accessor: (row: any) => (
         <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-indigo-500" />
           <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-mono">{row.currency_code}</span>
         </div>
       ),
       width: 'w-24 sm:w-32'
     },
     {
       header: 'الرصيد الجاري',
       accessor: (row: any) => (
         <span dir="ltr" className="font-black font-mono text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
           {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
         </span>
       ),
       className: 'text-left'
     },
     {
       header: 'أرباح/خسائر فروق الصرف',
       accessor: (row: any) => (
         <div dir="ltr" className={`flex flex-col items-end gap-1 ${row.unrealizedGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
           <span className="font-black font-mono text-sm sm:text-base tracking-tighter">
             {row.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(row.unrealizedGain)}
           </span>
           <div className="flex items-center gap-1">
             <div className={`w-1 h-3 rounded-full ${row.unrealizedGain >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
             <span className="text-[9px] font-black uppercase tracking-wider opacity-60">غير محققة</span>
           </div>
         </div>
       ),
       className: 'text-left bg-slate-50/50 dark:bg-slate-800/30'
     },
   ];

   return (
     <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
       {/* Premium Command Center: Currency Discrepancy Matrix */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
         <MobileCard padding="sm" className="lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-indigo-500/5 rounded-full blur-2xl sm:blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
           <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-indigo-500/10 text-indigo-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 flex-shrink-0 relative z-10">
             <RefreshCw size={24} className="sm:hidden" />
             <RefreshCw size={28} className="hidden sm:block md:hidden" />
             <RefreshCw size={32} className="hidden md:block group-hover:rotate-180 transition-transform duration-1000" />
           </div>
           <div className="relative z-10">
             <div className="flex items-center gap-2 mb-1">
               <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
               <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white tracking-tight">مصفوفة فروق تحويل العملات</h3>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">تحليل فروق العملات الأجنبية</p>
             <p className="mt-2 sm:mt-4 text-xs font-bold text-slate-500 leading-relaxed">
               يعتمد هذا التحليل على أسعار الصرف الحالية في السوق العالمية، ويقوم بحساب الفروق المالية غير المحققة للأرصدة البنكية والنقدية.
             </p>
           </div>
         </MobileCard>

         <MobileCard padding="lg" className={cn("flex flex-col justify-center relative overflow-hidden group border-none shadow-2xl", totalDiff >= 0 ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/50 dark:bg-rose-900/40 text-white')}>
           <div className="absolute top-0 right-0 p-3 sm:p-4 opacity-20 transform translate-x-2 -translate-y-2 sm:translate-x-4 sm:-translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700">
             {totalDiff >= 0 ? <TrendingUp size={60} className="sm:hidden" /> : <TrendingDown size={60} className="sm:hidden" />}
             {totalDiff >= 0 ? <TrendingUp size={80} className="hidden sm:block" /> : <TrendingDown size={80} className="hidden sm:block" />}
           </div>
           <span className="text-[10px] font-black uppercase opacity-60 mb-1 sm:mb-2 tracking-wider text-white">صافي فروق الصرف</span>
           <div className="flex items-end gap-2">
             <p dir="ltr" className="text-2xl sm:text-3xl md:text-4xl font-black font-mono text-white tracking-tighter">
               {totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff).split(' ')[0]}
             </p>
           </div>
           <div className="mt-3 sm:mt-6 flex items-center gap-2">
             <div className="px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-md rounded-full">
               <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1">
                 <Activity size={10} /> {totalDiff >= 0 ? 'أرباح' : 'خسائر'}
               </span>
             </div>
           </div>
         </MobileCard>
       </div>

       {/* Granular Asset Breakdown */}
       <MobileCard padding="none" className="overflow-hidden">
         <div className="p-3 sm:p-4 md:p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center gap-2 sm:gap-3 bg-slate-50/50 dark:bg-slate-800/30">
           <div className="w-1.5 h-4 sm:w-2 sm:h-6 bg-indigo-500 rounded-full" />
           <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">تفصيل الأرصدة النقدية الأجنبية</h4>
         </div>
         <div className="overflow-x-auto">
           <ExcelTable columns={columns} data={data || []} colorTheme="blue" />
         </div>
       </MobileCard>

       {/* Strategic Intelligence Note */}
       <MobileCard padding="sm" className="bg-amber-500/5 border border-amber-500/10 flex gap-3 sm:gap-4 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-1 h-full bg-amber-500/30" />
         <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0 group-hover:bg-amber-500/20 transition-colors relative z-10">
           <Info size={20} className="sm:hidden" />
           <Info size={24} className="hidden sm:block" />
         </div>
         <div className="space-y-1 relative z-10">
           <h5 className="font-black text-amber-800 dark:text-amber-500 text-[10px] sm:text-xs uppercase tracking-wider">تنبيه مالي</h5>
           <p className="text-[10px] sm:text-xs font-bold text-amber-900/60 dark:text-amber-400/60 leading-relaxed">
             هذه الأرباح أو الخسائر المسجلة هي مبالغ "غير محققة" (Unrealized Gains/Losses). تعبر عن القيمة التقديرية الحالية للأرصدة النقدية إذا تم تحويلها إلى العملة المحلية. لا تعتبر أرباحاً تشغيلية حتى يتم تنفيذ عملية الصرف الفعلية.
           </p>
         </div>
       </MobileCard>
     </div>
   );
};

export default CurrencyDiffView;