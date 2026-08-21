
import React from 'react';
import { X, Save, Loader2, Calculator } from 'lucide-react';
import { JournalEntryFormData } from '../../types/index';
import { cn } from '../../../../core/utils';
import { useJournalEntryForm } from '../../hooks/useJournalEntryForm';
import JournalEntryTable from './JournalEntryTable';
import JournalEntryTotals from './JournalEntryTotals';

interface AddJournalEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: JournalEntryFormData) => void;
    isSubmitting: boolean;
}

const AddJournalEntryModal: React.FC<AddJournalEntryModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
    const {
        register,
        handleSubmit,
        errors,
        setValue,
        fields,
        append,
        remove,
        accounts,
        isLoadingAccounts,
        currencies,
        selectedCurrency,
        exchangeRate,
        isDivide,
        totals,
        difference,
        isBalanced
    } = useJournalEntryForm(onSubmit, isOpen);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm  max-md:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-md:rounded-xl shadow-2xl w-full max-w-4xl my-auto animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border dark:border-slate-800">

                {/* Header */}
                <div className="flex justify-between items-center p-6 max-md:p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 rounded-t-3xl">
                    <div className="flex items-center  max-md:gap-3">
                        <div className=" max-md:p-2 bg-accent/10 rounded-xl">
                            <Calculator className="text-accent" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">قيد يومية جديد</h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">إنشاء قيد محاسبي يدوي في دفتر اليومية</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 max-md:p-3 space-y-6">

                        {/* Header Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-4  max-md:gap-4 bg-gray-50 dark:bg-slate-800/50  max-md:p-4 rounded-2xl max-md:rounded-xl border border-gray-100 dark:border-slate-800">
                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-xs font-bold text-gray-600 dark:text-slate-400">تاريخ القيد</label>
                                <input
                                    type="date"
                                    {...register('date', { required: true })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-slate-100 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                                    dir="ltr"
                                />
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-xs font-bold text-gray-600 dark:text-slate-400">العملة</label>
                                <select
                                    {...register('currency_code')}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-slate-100 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                                >
                                    {currencies.data?.map((c: any) => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600 dark:text-slate-400">سعر الصرف {selectedCurrency !== 'SAR' && (isDivide ? '(القسمة ÷)' : '(الضرب ×)')}</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    disabled={selectedCurrency === 'SAR'}
                                    value={exchangeRate || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setValue('exchange_rate', val || 1, { shouldValidate: true });
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-slate-100 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all disabled:opacity-50 font-mono"
                                    dir="ltr"
                                />
                            </div>

                            <div className="md:col-span-4 space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 dark:text-slate-400">البيان (الوصف العام)</label>
                                <input
                                    type="text"
                                    {...register('description', { required: true })}
                                    className={cn("w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl dark:text-slate-100 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all", errors.description ? "border-red-500" : "border-gray-200 dark:border-slate-700")}
                                />
                                {errors.description && <p className="text-[10px] text-red-500 font-bold px-1">{errors.description.message || 'مطلوب'}</p>}
                            </div>
                        </div>

                        {/* Lines Table */}
                        <JournalEntryTable
                            fields={fields}
                            append={append}
                            remove={remove}
                            register={register}
                            errors={errors}
                            setValue={setValue}
                            accounts={accounts}
                            isLoadingAccounts={isLoadingAccounts}
                        />

                        {/* Totals Section */}
                        <JournalEntryTotals
                            totals={totals}
                            currencyCode={selectedCurrency || 'SAR'}
                            exchangeRate={Number(exchangeRate) || 1}
                            isDivide={isDivide}
                            difference={difference}
                            isBalanced={isBalanced}
                            errors={errors}
                        />

                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 max-md:p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex justify-end  max-md:gap-3 rounded-b-3xl">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 max-md:px-3 py-2.5 text-gray-600 dark:text-slate-400 font-bold hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded-xl transition-all"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={!isBalanced || isSubmitting}
                            className="px-8 max-md:px-3 py-2.5 bg-accent hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center  max-md:gap-2"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span>حفظ وترحيل القيد</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default AddJournalEntryModal;
