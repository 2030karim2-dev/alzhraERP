import React from 'react';
import { Repeat } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import type { ExpenseFormData } from '../../../types';

interface RecurringExpenseSectionProps {
  register: UseFormRegister<ExpenseFormData>;
  isRecurring: boolean;
}

export const RecurringExpenseSection: React.FC<RecurringExpenseSectionProps> = ({
  register,
  isRecurring,
}) => {
  return (
    <div className="border-b bg-[var(--app-surface)] p-5 dark:border-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-900/30">
            <Repeat size={14} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase text-gray-800 dark:text-slate-100">
              مصروف متكرر
            </h4>
            <p className="text-[10px] font-bold uppercase text-gray-400">
              Automated Recurring Expense
            </p>
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" {...register('is_recurring')} className="peer sr-only" />
          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700 rtl:peer-checked:after:-translate-x-full"></div>
        </label>
      </div>

      {isRecurring && (
        <div className="animate-in slide-in-from-top-2 grid grid-cols-2 gap-4 duration-300">
          <div className="space-y-1.5">
            <label className="px-1 text-[10px] font-bold uppercase text-gray-400">تكرار كل</label>
            <select
              {...register('frequency')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-[10px] font-bold outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="daily">يومي (Daily)</option>
              <option value="weekly">أسبوعي (Weekly)</option>
              <option value="monthly">شهري (Monthly)</option>
              <option value="yearly">سنوي (Yearly)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="px-1 text-[10px] font-bold uppercase text-gray-400">
              تاريخ انتهاء التكرار
            </label>
            <input
              type="date"
              {...register('recurring_end_date')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-[10px] font-bold outline-none dark:border-slate-700 dark:bg-slate-800"
              dir="ltr"
            />
          </div>
        </div>
      )}
    </div>
  );
};
