import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { JournalEntryFormData } from '../../types/index';
import SearchableAccountSelector from '../../../../ui/common/SearchableAccountSelector';

interface JournalEntryTableProps {
    fields: any[];
    append: (value: any) => void;
    remove: (index: number) => void;
    register: UseFormRegister<JournalEntryFormData>;
    errors: FieldErrors<JournalEntryFormData>;
    setValue: UseFormSetValue<JournalEntryFormData>;
    accounts: any[] | undefined;
    isLoadingAccounts: boolean;
}

const JournalEntryTable: React.FC<JournalEntryTableProps> = ({
    fields,
    append,
    remove,
    register,
    errors,
    setValue,
    accounts,
    isLoadingAccounts
}) => {
    return (
        <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
            <div className="bg-gray-100 dark:bg-slate-800 px-4 py-2.5 grid grid-cols-12 gap-4 text-[11px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-3">الحساب</div>
                <div className="col-span-4">البيان (اختياري)</div>
                <div className="col-span-2 text-left">مدين</div>
                <div className="col-span-2 text-left">دائن</div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-start group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="col-span-1 flex items-center justify-center pt-2">
                            <span dir="ltr" className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400 flex items-center justify-center text-xs font-bold">
                                {index + 1}
                            </span>
                        </div>

                        <div className="col-span-3">
                            {isLoadingAccounts ? (
                                <div className="text-xs text-gray-400 p-2 animate-pulse">جاري التحميل...</div>
                            ) : (
                                <SearchableAccountSelector
                                    accounts={accounts || []}
                                    selectedId={fields[index].account_id}
                                    onSelect={(id: string) => setValue(`lines.${index}.account_id`, id, { shouldValidate: true })}
                                    className="w-full"
                                />
                            )}
                            {errors.lines?.[index]?.account_id && <p className="text-[9px] text-red-500 font-bold px-1 mt-0.5">{errors.lines[index]?.account_id?.message}</p>}
                        </div>

                        <div className="col-span-4">
                            <input
                                type="text"
                                {...register(`lines.${index}.description` as const)}
                                placeholder="شرح للحركة..."
                                className="w-full px-2 py-2 bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-slate-700 rounded-xl text-sm dark:text-slate-200 focus:border-accent outline-none transition-all"
                            />
                        </div>

                        <div className="col-span-2">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...register(`lines.${index}.debit_amount` as const, { valueAsNumber: true })}
                                className="w-full px-2 py-2 bg-emerald-50/10 dark:bg-emerald-900/5 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/30 rounded-xl text-sm dark:text-emerald-400 focus:border-accent outline-none text-left font-mono"
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (val > 0) setValue(`lines.${index}.credit_amount`, 0);
                                }}
                                dir="ltr"
                            />
                        </div>

                        <div className="col-span-2 relative">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...register(`lines.${index}.credit_amount` as const, { valueAsNumber: true })}
                                className="w-full px-2 py-2 bg-red-50/10 dark:bg-red-900/5 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 rounded-xl text-sm dark:text-red-400 focus:border-accent outline-none text-left font-mono"
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (val > 0) setValue(`lines.${index}.debit_amount`, 0);
                                }}
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="absolute -left-10 top-2 p-1.5 text-gray-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={() => append({ account_id: '', description: '', debit_amount: 0, credit_amount: 0 })}
                className="w-full py-3 bg-gray-50/50 dark:bg-slate-800/30 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 text-sm font-bold flex items-center justify-center gap-2 border-t border-gray-100 dark:border-slate-800 transition-colors"
            >
                <Plus size={18} />
                <span>إضافة صف جديد</span>
            </button>
        </div>
    );
};

export default JournalEntryTable;
