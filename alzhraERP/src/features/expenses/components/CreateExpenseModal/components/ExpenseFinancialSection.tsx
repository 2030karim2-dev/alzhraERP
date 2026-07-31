import React from 'react';
import { ShieldCheck, Wallet } from 'lucide-react';
import { UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { ExpenseFormData } from '../../../types';
import { cn } from '../../../../../core/utils';

interface ExpenseFinancialSectionProps {
    watch: UseFormWatch<ExpenseFormData>;
    setValue: UseFormSetValue<ExpenseFormData>;
}

export const ExpenseFinancialSection: React.FC<ExpenseFinancialSectionProps> = ({ watch, setValue }) => {
    return (
        <div className="p-5 space-y-4 bg-gray-50/30 dark:bg-slate-950/30">
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 px-1">طريقة السداد</label>
                    <div className="flex h-[42px] bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
                        <button type="button" onClick={() => setValue('payment_method', 'cash')} className={cn("flex-1 rounded-lg text-[10px] font-bold transition-all", watch('payment_method') === 'cash' ? "bg-white dark:bg-slate-600 text-blue-600 shadow-sm" : "text-gray-400")}>كاش</button>
                        <button type="button" onClick={() => setValue('payment_method', 'bank')} className={cn("flex-1 rounded-lg text-[10px] font-bold transition-all", watch('payment_method') === 'bank' ? "bg-white dark:bg-slate-600 text-blue-600 shadow-sm" : "text-gray-400")}>بنكي</button>
                    </div>
                </div>
                <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 px-1">حالة القيد</label>
                    <div className="flex h-[42px] bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
                        <button type="button" onClick={() => setValue('status', 'posted')} className={cn("flex-1 rounded-lg text-[10px] font-bold transition-all", watch('status') === 'posted' ? "bg-blue-600 text-white shadow-sm" : "text-gray-400")}>مرحل</button>
                        <button type="button" onClick={() => setValue('status', 'draft')} className={cn("flex-1 rounded-lg text-[10px] font-bold transition-all", watch('status') === 'draft' ? "bg-white dark:bg-slate-600 text-gray-800 shadow-sm" : "text-gray-400")}>مسودة</button>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl flex items-center justify-between border border-blue-100 dark:border-blue-900/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl">
                        <ShieldCheck size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase">المزامنة المحاسبية</p>
                        <p className="text-[8px] font-bold text-blue-600 dark:text-blue-400">سيتم إنشاء قيد يومية آلي في الأستاذ العام</p>
                    </div>
                </div>
                <Wallet className="text-blue-200 dark:text-blue-800" size={24} />
            </div>
        </div>
    );
};
