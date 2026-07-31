
import React from 'react';
import { useCurrencyDiffs } from '../hooks';
import { formatCurrency } from '../../../core/utils';
import { RefreshCw, Info, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';

const CurrencyDiffView: React.FC = () => {
  const { data, isLoading } = useCurrencyDiffs();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin shadow-xl shadow-indigo-500/20" />
        <p className="text-slate-400 font-bold tracking-[0.2em] animate-pulse uppercase text-[10px]">جاري جرد أرصدة العملات الأجنبية...</p>
      </div>
    );
  }

  const totalDiff = data?.reduce((s: number, a: any) => s + a.unrealizedGain, 0) || 0;

  const columns = [
    {
      header: 'الحساب المالي',
      accessor: (row: any) => (
        <div className="flex flex-col gap-1">
          <span className="font-black text-slate-800 dark:text-white tracking-tight text-sm">{row.name}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.account_type || 'Asset'}</span>
        </div>
      )
    },
    {
      header: 'كود العملة',
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-pulse shadow-indigo-500" />
          <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg text-xs font-mono">{row.currency_code}</span>
        </div>
      ),
      width: 'w-32'
    },
    {
      header: 'الرصيد الجاري',
      accessor: (row: any) => (
        <span dir="ltr" className="font-black font-mono text-slate-700 dark:text-slate-300">
          {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
      className: 'text-left'
    },
    {
      header: 'أرباح/خسائر فروق الصرف (غير محققة)',
      accessor: (row: any) => (
        <div dir="ltr" className={`flex flex-col items-end gap-1 ${row.unrealizedGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          <span className="font-black font-mono text-base tracking-tighter">
            {row.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(row.unrealizedGain)}
          </span>
          <div className="flex items-center gap-1">
            <div className={`w-1 h-3 rounded-full ${row.unrealizedGain >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Unrealized Performance</span>
          </div>
        </div>
      ),
      className: 'text-left bg-slate-50/50 dark:bg-slate-800/30'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      {/* Premium Command Center: Currency Discrepancy Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel bento-item p-8 bg-white dark:bg-slate-900 border-none shadow-2xl flex items-center gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
            <RefreshCw size={32} className="group-hover:rotate-180 transition-transform duration-1000" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">مصفوفة فروق تحويل العملات</h3>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Forex Discrepancy Intelligence Center</p>
            <p className="mt-4 text-xs font-bold text-slate-500 leading-relaxed max-w-md">
              يعتمد هذا التحليل على أسعار الصرف الحالية في السوق العالمية، ويقوم بحساب الفروق المالية غير المحققة للأرصدة البنكية والنقدية.
            </p>
          </div>
        </div>

        <div className={`glass-card bento-item p-10 border-none shadow-2xl flex flex-col justify-center relative overflow-hidden group ${totalDiff >= 0 ? 'bg-emerald-600/90' : 'bg-rose-600/50 dark:bg-rose-900/40'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700">
            {totalDiff >= 0 ? <TrendingUp size={80} /> : <TrendingDown size={80} />}
          </div>
          <span className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.3em] text-white">صافي فروق الصرف الحالية</span>
          <div className="flex items-end gap-2">
            <p dir="ltr" className="text-4xl font-black font-mono text-white tracking-tighter">
              {totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff).split(' ')[0]}
            </p>
            <span className="text-xs font-black text-white/80 mb-2 uppercase">SAR Equivalence</span>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full">
              <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                <Activity size={10} /> Live Market Pulse
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Granular Asset Breakdown */}
      <div className="glass-panel bento-item bg-white dark:bg-slate-900 border-none shadow-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="w-2 h-6 bg-indigo-500 rounded-full" />
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">تفصيل الأرصدة النقدية الأجنبية</h4>
        </div>
        <ExcelTable columns={columns} data={data || []} colorTheme="blue" />
      </div>

      {/* Strategic Intelligence Note */}
      <div className="glass-card bento-item p-6 bg-amber-500/5 border border-amber-500/10 flex gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-1 h-full bg-amber-500/30" />
        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
          <Info size={24} />
        </div>
        <div className="space-y-1">
          <h5 className="font-black text-amber-800 dark:text-amber-500 text-xs uppercase tracking-widest pl-1">Financial Intelligence Notice</h5>
          <p className="text-[11px] font-bold text-amber-900/60 dark:text-amber-400/60 leading-relaxed italic">
            تنبيه استراتيجي: هذه الأرباح أو الخسائر المسجلة هي مبالغ "غير محققة" (Unrealized Gains/Losses). تعبر عن القيمة التقديرية الحالية للأرصدة النقدية إذا تم تحويلها في هذه اللحظة إلى العملة المحلية (الريال السعودي). لا تعتبر هذه المبالغ أرباحاً تشغيلية حتى يتم تنفيذ عملية الصرف الفعلية.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CurrencyDiffView;