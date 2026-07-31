import React from 'react';
import { Repeat } from 'lucide-react';
import { UseFormRegister } from 'react-hook-form';
import { ExpenseFormData } from '../../../types';

interface RecurringExpenseSectionProps {
    register: UseFormRegister<ExpenseFormData>;
    isRecurring: boolean;
}

export const RecurringExpenseSection: React.FC<RecurringExpenseSectionProps> = ({ register, isRecurring }) => {
    return (
        <div className="p-5 border-b dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                        <Repeat size={14} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-800 dark:text-slate-100 uppercase">مصروف متكرر</h4>
                        <p className="text-[8px] font-bold text-gray-400 uppercase">Automated Recurring Expense</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" {...register('is_recurring')} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {isRecurring && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase px-1">تكرار كل</label>
                        <select {...register('frequency')} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 rounded-xl text-[10px] font-bold outline-none">
                            <option value="daily">يومي (Daily)</option>
                            <option value="weekly">أسبوعي (Weekly)</option>
                            <option value="monthly">شهري (Monthly)</option>
                            <option value="yearly">سنوي (Yearly)</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase px-1">تاريخ انتهاء التكرار</label>
                        <input type="date" {...register('recurring_end_date')} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 rounded-xl text-[10px] font-bold outline-none" dir="ltr" />
                    </div>
                </div>
            )}
        </div>
    );
};
