import React from 'react';
import { ArrowRightLeft, Save, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { formatNumberDisplay, cn } from '../../../../../core/utils';

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
                                        "group transition-all duration-300 ease-out",
                                        isEditing
                                            ? "bg-blue-50/80 dark:bg-blue-900/10 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]"
                                            : "hover:bg-white dark:hover:bg-slate-800/40 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-[1px] relative z-0 hover:z-10 rounded-2xl"
                                    )}
                                >
                                    <td className="p-4 align-middle text-center relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-2xl"></div>
                                        <div className="relative w-10 h-10 mx-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-sm shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 border border-gray-200/50 dark:border-slate-700">
                                            {curr.symbol}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle relative">
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors drop-shadow-sm">{curr.name_ar}</h4>
                                    </td>
                                    <td className="p-4 align-middle relative">
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200/50 dark:border-slate-700/50 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-200 dark:group-hover:border-blue-800/50 transition-all">
                                                {curr.code}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg border ${curr.exchange_operator === 'multiply' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                {curr.exchange_operator === 'multiply' ? 'ضرب (×)' : 'قسمة (÷)'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle relative">
                                        {isEditing ? (
                                            <div className="flex gap-2 items-center animate-in slide-in-from-right-3 zoom-in-[0.98] duration-200">
                                                <div className="relative w-full">
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        defaultValue={currentRate}
                                                        onChange={(e) => setNewRateValue(parseFloat(e.target.value))}
                                                        className="w-full bg-white dark:bg-slate-950 border-2 border-blue-500 p-2.5 rounded-2xl text-sm font-bold font-mono outline-none shadow-[0_0_15px_rgba(59,130,246,0.15)] focus:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-shadow pr-8"
                                                        placeholder="أدخل السعر الجديد..."
                                                    />
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-300 select-none">{curr.code}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleUpdateRate(curr.code)}
                                                    className="shrink-0 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all outline-none"
                                                    title="حفظ التعديل"
                                                >
                                                    <Save size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setActiveRateEdit(null)}
                                                    className="shrink-0 p-3 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-gray-300 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-2xl transition-all outline-none active:scale-95"
                                                    title="إلغاء التعديل"
                                                >
                                                    <XIcon size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => { setActiveRateEdit(curr.code); setNewRateValue(currentRate); }}
                                                className="group/edit flex items-center justify-between p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-950 border-2 border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 cursor-pointer transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:hover:shadow-black/20"
                                                title="انقر لتعديل السعر المباشر"
                                            >
                                                <div className="flex items-baseline gap-1.5 flex-col">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <h3 className="text-lg font-bold font-mono text-gray-800 dark:text-slate-200 leading-none group-hover/edit:text-blue-600 dark:group-hover/edit:text-blue-400 transition-colors">
                                                            {formatNumberDisplay(currentRate)}
                                                        </h3>
                                                        <span className="text-[9px] font-bold text-gray-400 group-hover/edit:text-blue-300">{baseCurrency?.code}</span>
                                                    </div>
                                                    <span className="text-[8px] font-bold text-gray-400">
                                                        المعادل = المبلغ {curr.exchange_operator === 'multiply' ? '×' : '÷'} {currentRate}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover/edit:opacity-100 transition-all translate-x-4 group-hover/edit:translate-x-0">
                                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">تعديل</span>
                                                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                                        <ArrowRightLeft size={12} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle text-center relative">
                                        <div className="absolute inset-0 bg-gradient-to-bl from-rose-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-r-2xl pointer-events-none"></div>
                                        <button
                                            onClick={() => { if (confirm('هل أنت متأكد من مسح هذه العملة نهائياً بنظام لا رجعة فيه؟')) deleteCurrency(curr.code); }}
                                            className="relative p-2.5 mx-auto flex text-gray-300 dark:text-gray-600 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-600 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:shadow-lg hover:shadow-rose-500/20 hover:scale-110 active:scale-95"
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
