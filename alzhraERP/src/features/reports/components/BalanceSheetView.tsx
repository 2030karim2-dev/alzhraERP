import React from 'react';
import { useBalanceSheet } from '../hooks';
import { formatCurrency } from '../../../core/utils';
import { Landmark, Scale, ShieldCheck, Wallet, Layers, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
// import ExcelTable from '../../../ui/common/ExcelTable';
import { cn } from '../../../core/utils';
import ShareButton from '../../../ui/common/ShareButton';
import { MobileCard } from './MobileComponents';

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

const ReportSection: React.FC<ReportSectionProps> = ({ title, items, total, icon: Icon, color }) => {
    const theme = {
        blue: { header: 'bg-blue-500/10 text-blue-600 border-blue-200/20', dot: 'bg-blue-400' },
        rose: { header: 'bg-rose-500/10 text-rose-600 border-rose-200/20', dot: 'bg-rose-400' },
        emerald: { header: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/20', dot: 'bg-emerald-400' }
    };
    const currentTheme = theme[color];

    return (
        <div className="glass-card bento-item flex flex-col shadow-xl border-none">
            <div className={cn("  max-md:p-4 border-b flex items-center justify-between", currentTheme.header)}>
                <div className="flex items-center   max-md:gap-3">
                    <div className="  max-md:p-2 bg-white/50 dark:bg-slate-800 rounded-xl shadow-sm">
                        <Icon size={16} />
                    </div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">{title}</h3>
                </div>
                <span className="text-[10px] font-bold opacity-60 bg-white/30 px-2 py-0.5 rounded-lg">{items.length} بند</span>
            </div>
            <div className="flex-1   max-md:p-4 space-y-3">
                {items.map((item) => (
                    <div key={item.code} className="flex justify-between items-center group   max-md:p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center   max-md:gap-3">
                            <div className={cn("w-1 h-1 rounded-full opacity-40 group-hover:scale-150 transition-transform", currentTheme.dot)} />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.name}</span>
                        </div>
                        <span dir="ltr" className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{formatCurrency(Math.abs(item.netBalance))}</span>
                    </div>
                ))}
            </div>
            <div className="  max-md:p-5 border-t border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">إجمالي القسم</span>
                <span dir="ltr" className={cn("font-mono text-xl font-bold tracking-tighter", color === 'blue' ? "text-blue-600" : color === 'rose' ? "text-rose-600" : "text-emerald-600")}>
                    {formatCurrency(total)}
                </span>
            </div>
        </div>
    );
};

const BalanceSheetView: React.FC = () => {
    const { data, isLoading } = useBalanceSheet();

    if (isLoading) return <div className="p-20  max-md:p-6 text-center animate-pulse text-slate-400 font-bold tracking-widest uppercase">جاري صياغة المركز المالي...</div>;

    if (!data) return <div className="p-8  max-md:p-4 text-center text-slate-500 font-bold">لا توجد بيانات مالية متاحة حالياً</div>;

    const { assets, liabilities, equity, totalAssets, totalLiabEquity } = data;
    const isBalanced = Math.abs(totalAssets - totalLiabEquity) < 1;

    return (
        <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6 pb-10 sm:pb-12 print-area animate-in slide-in-from-bottom-4 duration-700">
            {/* Professional Financial Header */}
            <MobileCard padding="sm" className="bg-white/70 dark:bg-slate-900/40 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between   max-md:gap-4 border-none shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-slate-900/5 dark:bg-white/5 rounded-full blur-2xl sm:blur-3xl -mr-16 -mt-16 sm:-mr-32 sm:-mt-32" />

                <div className="relative z-10 text-right">
                    <div className="flex items-center   max-md:gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <div className="  max-md:p-2 sm:p-2.5 bg-slate-900 text-white rounded-xl sm:rounded-2xl shadow-xl hover:rotate-6 transition-transform">
                            <Landmark size={20} />
                        </div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">قائمة المركز المالي</h2>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center   max-md:gap-2">
                        <Clock size={12} />
                        تقرير مالي نهائي كما في <b dir="ltr" className="text-slate-600 dark:text-slate-300 ml-1">{new Date().toLocaleDateString('ar-SA-u-nu-latn')}</b>
                    </p>
                </div>

                <div className="flex items-center   max-md:gap-3 sm:gap-6 relative z-10">
                    <div className="text-left border-l border-slate-200 dark:border-slate-800/50 pl-3 sm:pl-6 hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">صافي الأصول</p>
                        <p dir="ltr" className="text-lg sm:text-2xl font-bold font-mono text-blue-600 tracking-tighter">{formatCurrency(totalAssets)}</p>
                    </div>
                    <ShareButton
                        size="md"
                        showLabel
                        eventType="balance_sheet"
                        title="مشاركة الميزانية العمومية"
                        className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl max-md:rounded-xl   max-md:p-3 sm:p-4 shadow-xl transition-all"
                        message={`🏦 الميزانية العمومية (المركز المالي) - الزهراء سمارت\n━━━━━━━━━━━━━━\n💼 إجمالي الأصول: ${formatCurrency(totalAssets)}\n📋 إجمالي الخصوم: ${formatCurrency(Math.abs(liabilities.reduce((s: number, a: BalanceItem) => s + a.netBalance, 0)))}\n🏛️ حقوق الملكية: ${formatCurrency(Math.abs(equity.reduce((s: number, a: BalanceItem) => s + a.netBalance, 0)))}\n${isBalanced ? '✅ الميزانية متزنة' : `❌ غير متزنة - الفرق: ${formatCurrency(Math.abs(totalAssets - totalLiabEquity))}`}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA-u-nu-latn')}`}
                    />
                </div>
            </MobileCard>

            <div className="grid grid-cols-1 lg:grid-cols-2   max-md:gap-4 sm:gap-6 items-start">
                {/* Left Column: Assets - Trust Blue */}
                <ReportSection title="الأصول المتداولة وغير المتداولة" icon={Wallet} items={assets} total={totalAssets} color="blue" />

                {/* Right Column: Liabilities & Equity - Financial Rose & Emerald */}
                <div className="space-y-4 sm:space-y-6">
                    <ReportSection title="الالتزامات والخصوم" icon={Scale} items={liabilities} total={Math.abs(liabilities.reduce((s: number, a: BalanceItem) => s + a.netBalance, 0))} color="rose" />
                    <ReportSection
                        title="حقوق الملكية والأرباح"
                        icon={Layers}
                        items={equity}
                        total={Math.abs(equity.reduce((s: number, a: BalanceItem) => s + a.netBalance, 0))}
                        color="emerald"
                    />
                </div>
            </div>

            {/* Verification Footer - Shield Theme */}
            <MobileCard padding="sm" className={cn(
                "flex flex-col sm:flex-row items-center justify-between border-none shadow-2xl relative overflow-hidden",
                isBalanced ? "bg-emerald-500/5 dark:bg-emerald-500/10" : "bg-rose-500/5 dark:bg-rose-500/10"
            )}>
                <div className={cn("absolute top-0 right-0 w-1 h-full", isBalanced ? "bg-emerald-500" : "bg-rose-500")} />
                <div className="flex items-center   max-md:gap-3 sm:gap-4 relative z-10">
                    <div className={cn("  max-md:p-2 sm:p-3 rounded-full", isBalanced ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-rose-500 text-white shadow-lg shadow-rose-500/30")}>
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm sm:text-lg text-slate-800 dark:text-white uppercase tracking-tight">تحقق النظام المحاسبي</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {isBalanced ? 'المعادلة المحاسبية متزنة (الأصول = الخصوم + الملكية)' : `يوجد تباين قيمته ${formatCurrency(Math.abs(totalAssets - totalLiabEquity))}`}
                        </p>
                    </div>
                </div>

                <div className="mt-3 sm:mt-0 px-4 sm:px-6 py-2 bg-slate-900/5 dark:bg-white/5 rounded-full border border-slate-200/50 dark:border-white/10 relative z-10">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isBalanced ? 'BALANCED STATUS' : 'UNBALANCED STATUS'}</span>
                </div>
            </MobileCard>
        </div>
    );
};

export default BalanceSheetView;