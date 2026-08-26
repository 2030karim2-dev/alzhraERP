import React from 'react';
// Fix: Corrected import path to point to the barrel file.
import { useFinancials } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
// Fix: Added missing 'Wallet' and 'Layers' icons to resolve 'Cannot find name' errors.
import { Loader2, Landmark, Scale, ShieldCheck, Wallet, Layers } from 'lucide-react';
import { cn } from '../../../../core/utils';

interface ReportSectionProps {
    title: string;
    items: any[];
    total: number;
    icon: any;
    color: 'blue' | 'rose' | 'emerald';
}

const ReportSection: React.FC<ReportSectionProps> = ({ title, items, total, icon: Icon, color }) => {
    const theme = {
        blue: { header: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400', total: 'bg-blue-600 text-white' },
        rose: { header: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400', total: 'bg-rose-600 text-white' },
        emerald: { header: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400', total: 'bg-emerald-600 text-white' }
    };
    const currentTheme = theme[color];

    return (
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm flex flex-col">
            <div className={`p-3 max-md:p-2 border-b border-[var(--app-border)] flex items-center gap-2 ${currentTheme.header}`}>
                <Icon size={14} />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">{title}</h3>
            </div>
            <div className="flex-1 divide-y divide-[var(--app-border)]">
                {items.map((item) => (
                    <div key={item.code} className="flex justify-between items-center p-2 max-md:p-1.5 hover:bg-[var(--app-surface-hover)]">
                        <span className="text-[11px] font-bold text-[var(--app-text)]">{item.name}</span>
                        <span dir="ltr" className="font-mono text-xs font-bold text-[var(--app-text)]">{formatCurrency(Math.abs(item.net_balance))}</span>
                    </div>
                ))}
            </div>
            <div className={`p-3 max-md:p-2 border-t border-[var(--app-border)] flex justify-between items-center ${currentTheme.total}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest">الإجمالي</span>
                <span dir="ltr" className="font-mono text-base font-bold">{formatCurrency(total)}</span>
            </div>
        </div>
    );
};

// Fix: Add missing Props interface
interface Props {
    dateRange: { from: string; to: string };
}

const BalanceSheet: React.FC<Props> = ({ dateRange }) => {
    const { data: financials, isLoading } = useFinancials(undefined, dateRange.to);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-[var(--app-text-secondary)] font-medium">جاري إعداد الميزانية العمومية...</p>
        </div>
    );

    if (!financials) return <div className="p-8 max-md:p-4 text-center text-[var(--app-text-secondary)]">لا توجد بيانات مالية متاحة</div>;

    const { assets, liabilities, equity, netIncome, isBalanced, difference, totals } = financials.balanceSheet;

    const totalAssets = totals.assets;
    const totalLiabilities = Math.abs(totals.liabilities);
    const totalEquity = Math.abs(totals.equity);

    // Server already computes difference accurately
    const differenceAmount = difference || 0;

    return (
        <div className="max-w-none mx-auto space-y-4 pb-12 print-area animate-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-[var(--app-surface)] border border-[var(--app-border)] p-3 max-md:p-2 text-center shadow-sm flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-[var(--app-text)] uppercase tracking-tight">المركز المالي</h2>
                    <p className="text-xs text-[var(--app-text-secondary)]">كما في تاريخ <b dir="ltr" className="text-[var(--app-text)]">{dateRange.to}</b></p>
                </div>
                <div className="p-3 max-md:p-2 bg-slate-900 text-white"><Landmark size={24} /></div>
            </div>

            <div className="grid lg:grid-cols-2 gap-3 max-md:gap-3 items-start">
                {/* Left Column: Assets */}
                <ReportSection title="الأصول" icon={Wallet} items={assets} total={totalAssets} color="blue" />

                {/* Right Column: Liabilities & Equity */}
                <div className="space-y-3">
                    <ReportSection title="الخصوم" icon={Scale} items={liabilities} total={totalLiabilities} color="rose" />
                    <ReportSection
                        title="حقوق الملكية"
                        icon={Layers}
                        items={[...equity, { name: 'صافي أرباح/خسائر الفترة', net_balance: netIncome, code: '3999' }]}
                        total={totalEquity}
                        color="emerald"
                    />
                </div>
            </div>

            {/* Verification Footer */}
            <div className={cn(
                "mt-4 p-3 max-md:p-2 flex items-center justify-center gap-3 max-md:gap-2 border-2 font-bold text-xs",
                isBalanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
            )}>
                <ShieldCheck size={20} />
                <span className="uppercase tracking-widest">
                    {isBalanced ? 'الميزانية متزنة (Balanced)' : `غير متزنة - الفرق ${formatCurrency(Math.abs(differenceAmount))}`}
                </span>
            </div>
        </div>
    );
};

export default BalanceSheet;