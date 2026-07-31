import React from 'react';
import { DollarSign } from 'lucide-react';
import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { ExpenseFormData } from '../../../types';
import { convertToBaseCurrency } from '../../../../../core/utils';

interface ExpenseAmountSectionProps {
    register: UseFormRegister<ExpenseFormData>;
    currenciesData: any[];
    watch: UseFormWatch<ExpenseFormData>;
    setValue: UseFormSetValue<ExpenseFormData>;
}

export const ExpenseAmountSection: React.FC<ExpenseAmountSectionProps> = ({ register, currenciesData, watch, setValue }) => {
    const selectedCurrency = watch('currency_code');
    const amount = watch('amount') || 0;
    const exchangeRate = watch('exchange_rate') || 1;

    const currencyObj = currenciesData?.find((c: any) => c.code === selectedCurrency);
    const isDivide = currencyObj?.exchange_operator === 'divide';

    return (
        <div className="p-5 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex flex-col gap-4">
            <div className="flex flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1.5 px-1">
                        المبلغ المطلوب صرفه
                    </label>
                    <div className="relative">
                        <input
                            type="number" step="0.01"
                            {...register('amount', { required: true, min: 0.01, valueAsNumber: true })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-rose-100 dark:border-rose-900/30 rounded-xl text-2xl font-bold text-rose-600 dark:text-rose-400 outline-none focus:border-rose-500 transition-all font-mono"
                            placeholder="0.00"
                        />
                        <DollarSign className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-300" size={20} />
                    </div>
                </div>

                {selectedCurrency !== 'SAR' && (
                    <div className="w-32 shrink-0">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1 truncate">سعر الصرف {isDivide ? '÷' : '×'}</label>
                        <input
                            type="number"
                            step="0.000001"
                            value={exchangeRate || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setValue('exchange_rate', val || 1, { shouldValidate: true });
                            }}
                            className="w-full px-3 py-3 bg-white dark:bg-slate-950 border-2 border-amber-100 dark:border-slate-800 rounded-xl text-sm font-bold text-amber-600 dark:text-amber-400 outline-none focus:border-amber-500 font-mono text-center"
                        />
                    </div>
                )}

                <div className="w-24 shrink-0 space-y-1.5">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase text-center">العملة</label>
                    <select
                        {...register('currency_code')}
                        className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 p-3 rounded-xl text-sm font-bold outline-none appearance-none text-center"
                    >
                        {currenciesData?.map((c: any) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                </div>
            </div>

            {selectedCurrency !== 'SAR' && amount > 0 && exchangeRate > 0 && (
                <div className="bg-amber-50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase">المعادل بالعملة المرجعية (SAR)</span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-500 font-mono">
                        {convertToBaseCurrency({
                            amount,
                            currencyCode: (selectedCurrency || 'SAR') as any,
                            exchangeRate,
                            exchangeOperator: isDivide ? 'divide' : 'multiply'
                        }).toFixed(2)} SAR
                    </span>
                </div>
            )}
        </div>
    );
};
