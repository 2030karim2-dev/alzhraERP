
import React from 'react';
import { useFinancials } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react';
import { cn } from '../../../../core/utils';
import ShareButton from '../../../../ui/common/ShareButton';

interface Props {
    dateRange: { from: string; to: string };
}

const FinancialReportBlock: React.FC<{ title: string, icon: any, data: any[], total: number, color: 'emerald' | 'rose' }> = ({ title, icon: Icon, data, total, color }) => {
    const theme = {
        emerald: { icon: 'bg-emerald-500 text-white', header: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400', total: 'bg-emerald-600 text-white' },
        rose: { icon: 'bg-rose-500 text-white', header: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400', total: 'bg-rose-600 text-white' }
    };
    const currentTheme = theme[color];

    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-none shadow-sm flex flex-col">
            <div className={`p-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2 ${currentTheme.header}`}>
                <div className={`p-1.5 rounded-none shadow-sm ${currentTheme.icon}`}><Icon size={14} /></div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest">{title}</h3>
            </div>
            <div className="flex-1 p-2 space-y-px">
                {data.map((item: any) => (
                    <div key={item.code} className="flex justify-between p-2 hover:bg-gray-50/50 dark:hover:bg-slate-800/20">
                        <span className="text-[10px] font-bold text-gray-700 dark:text-slate-200">{item.name}</span>
                        <span dir="ltr" className="font-mono text-[10px] font-bold text-gray-800 dark:text-slate-100">{formatCurrency(Math.abs(item.net_balance))}</span>
                    </div>
                ))}
            </div>
            <div className={`p-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center ${currentTheme.total}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest">الإجمالي</span>
                <span dir="ltr" className="font-mono text-xl font-bold">{formatCurrency(total)}</span>
            </div>
        </div>
    );
};


const IncomeStatement: React.FC<Props> = ({ dateRange }) => {
    const { data: financials, isLoading } = useFinancials(dateRange.from, dateRange.to);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
            <p className="text-gray-500 dark:text-slate-400 font-medium">جاري إعداد قائمة الدخل...</p>
        </div>
    );

    if (!financials) return <div className="p-8 text-center text-gray-500 dark:text-slate-500">لا توجد بيانات مالية متاحة لهذه الفترة</div>;

    const { revenues, expenses, netIncome } = financials.incomeStatement;
    const totalRevenue = revenues.reduce((s: number, r: any) => s + Math.abs(r.net_balance), 0);
    const totalExpense = expenses.reduce((s: number, r: any) => s + r.net_balance, 0);

    return (
        <div className="max-w-none mx-auto space-y-4 pb-12 print-area animate-in slide-in-from-bottom-4 duration-500">
            {/* Report Header */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-none text-center shadow-sm flex justify-between items-center">
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tight">قائمة الدخل</h2>
                    <h3 className="text-[10px] text-gray-500 dark:text-slate-500 font-bold uppercase">Income Statement</h3>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-gray-100 dark:border-slate-700 text-xs text-gray-600 dark:text-slate-400">
                    <Calendar size={12} />
                    <span className="text-[9px] font-bold">من <b dir="ltr" className="text-gray-900 dark:text-slate-100">{dateRange.from}</b> إلى <b dir="ltr" className="text-gray-900 dark:text-slate-100">{dateRange.to}</b></span>
                </div>

                <div className="flex items-center gap-3">
                    <ShareButton
                        size="sm"
                        showLabel
                        eventType="income_statement"
                        title="مشاركة قائمة الدخل"
                        message={`📑 قائمة الدخل\n━━━━━━━━━━━━━━\n📗 إجمالي الإيرادات: ${formatCurrency(totalRevenue)}\n📕 إجمالي المصروفات: ${formatCurrency(totalExpense)}\n${netIncome >= 0 ? '✅' : '🔴'} صافي ${netIncome >= 0 ? 'الربح' : 'الخسارة'}: ${formatCurrency(Math.abs(netIncome))}\n📅 الفترة: من ${dateRange.from} إلى ${dateRange.to}`}
                    />
                    <div className="p-2 bg-slate-900 text-white rounded-none shadow-inner">
                        <FileText size={20} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <FinancialReportBlock title="الإيرادات" icon={TrendingUp} data={revenues} total={totalRevenue} color="emerald" />
                <FinancialReportBlock title="المصروفات" icon={TrendingDown} data={expenses} total={totalExpense} color="rose" />
            </div>

            {/* Net Income Summary */}
            <div className={cn(
                "relative overflow-hidden rounded-none shadow-xl border-2 p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:scale-[1.01]",
                netIncome >= 0
                    ? 'bg-slate-900 border-emerald-500'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900/50'
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn("p-3 rounded-none", netIncome >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-200 dark:bg-red-900/30 text-red-600 dark:text-red-400')}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <h3 className={cn("text-lg font-bold", netIncome >= 0 ? 'text-white' : 'text-red-800 dark:text-red-400')}>
                            {netIncome >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
                        </h3>
                        <p className={cn("text-[9px] font-bold opacity-80", netIncome >= 0 ? 'text-emerald-100' : 'text-red-600 dark:text-red-400')}>
                            Net Income / Loss
                        </p>
                    </div>
                </div>

                <div dir="ltr" className={cn("text-4xl font-mono font-bold tracking-tight", netIncome >= 0 ? 'text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                    {formatCurrency(netIncome)}
                </div>

                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
};

export default IncomeStatement;