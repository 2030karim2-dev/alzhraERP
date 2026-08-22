import React from 'react';
import { ArrowRightLeft, Save, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '../../../../../core/utils';

// Local icon component 
const XIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

interface CurrencyTableProps {
    otherCurrencies: any[];
    baseCurrency: any | undefined;
    getLatestRate: (code: string) => number;
    activeRateEdit: string | null;
    setActiveRateEdit: (code: string | null) => void;
    setNewRateValue: (val: number) => void;
    handleUpdateRate: (code: string) => void;
    deleteCurrency: (code: string) => void;
    refreshRates?: () => void;
    isSaving?: boolean;
}

export const CurrencyTable: React.FC<CurrencyTableProps> = ({
    otherCurrencies,
    baseCurrency,
    getLatestRate,
    activeRateEdit,
    setActiveRateEdit,
    setNewRateValue,
    handleUpdateRate,
    deleteCurrency,
    refreshRates,
    isSaving
}) => {
    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-gray-200/50 dark:border-slate-800/50 rounded-[2rem] overflow-hidden shadow-xl shadow-blue-900/5 dark:shadow-black/20">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800/60 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent dark:from-slate-800/20">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                        <ArrowRightLeft size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">أسعار الصرف</h3>
                        <p className="text-[10px] text-gray-500 font-medium">إدارة أسعار العملات مقابل {baseCurrency?.code}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href="https://ye-rial.com/aden/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-gray-500 hover:text-blue-600 transition-colors"
                    >
                        <ExternalLink size={12} />
                        المصدر: ye-rial.com (عدن)
                    </a>
                    <button
                        onClick={() => refreshRates?.()}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95",
                            isSaving && "animate-pulse"
                        )}
                    >
                        <RefreshCw size={14} className={cn(isSaving && "animate-spin")} />
                        تحديث من السوق (بيع - عدن)
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto p-1">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-800/60">
                            <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-20 text-center">الرمز</th>
                            <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">اسم العملة</th>
                            <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">الكود المرجعي</th>
                            <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-72">سعر الصرف (مقابل {baseCurrency?.code})</th>
                            <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-24 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                        {otherCurrencies.map((curr: any) => {
                            const currentRate = getLatestRate(curr.code);
                            const isEditing = activeRateEdit === curr.code;

                            return (
                                <tr
                                    key={curr.code}
                                    className={cn(
                                        "transition-colors duration-150 border-b border-gray-100 dark:border-slate-800/60",
                                        isEditing
                                            ? "bg-blue-50/50 dark:bg-blue-950/20"
                                            : "hover:bg-gray-50/60 dark:hover:bg-slate-800/40"
                                    )}
                                >
                                    <td className="p-3.5 align-middle text-center">
                                        <div className="w-9 h-9 mx-auto bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-sm border border-gray-200 dark:border-slate-700">
                                            {curr.symbol}
                                        </div>
                                    </td>
                                    <td className="p-3.5 align-middle">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{curr.name_ar}</h4>
                                    </td>
                                    <td className="p-3.5 align-middle">
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className="text-xs font-mono font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-700">
                                                {curr.code}
                                            </span>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${curr.exchange_operator === 'multiply' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'}`}>
                                                {curr.exchange_operator === 'multiply' ? 'ضرب (×)' : 'قسمة (÷)'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3.5 align-middle">
                                        {isEditing ? (
                                            <div className="flex gap-2 items-center">
                                                <div className="relative w-full">
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        defaultValue={currentRate}
                                                        onChange={(e) => setNewRateValue(parseFloat(e.target.value))}
                                                        className="w-full bg-white dark:bg-slate-950 border border-blue-500 p-2 rounded-lg text-sm font-bold font-mono outline-none pr-8 focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 select-none">{curr.code}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleUpdateRate(curr.code)}
                                                    className="shrink-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
                                                    title="حفظ التعديل"
                                                >
                                                    <Save size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setActiveRateEdit(null)}
                                                    className="shrink-0 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-gray-500 rounded-lg transition-colors"
                                                    title="إلغاء التعديل"
                                                >
                                                    <XIcon size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => { setActiveRateEdit(curr.code); setNewRateValue(currentRate); }}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 cursor-pointer transition-colors"
                                                title="انقر لتعديل السعر"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-sm font-bold font-mono text-gray-800 dark:text-slate-200">
                                                            {currentRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-mono">{baseCurrency?.code}</span>
                                                    </div>
                                                    <span className="text-[9px] text-gray-400">
                                                        المعادل = المبلغ {curr.exchange_operator === 'multiply' ? '×' : '÷'} {currentRate}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-gray-400 hover:text-blue-600">
                                                    <span className="text-[10px]">تعديل</span>
                                                    <ArrowRightLeft size={12} />
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3.5 align-middle text-center">
                                        <button
                                            onClick={() => { if (confirm('هل أنت متأكد من مسح هذه العملة نهائياً بنظام لا رجعة فيه؟')) deleteCurrency(curr.code); }}
                                            className="p-1.5 mx-auto text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                                            title="حذف العملة من النظام"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
