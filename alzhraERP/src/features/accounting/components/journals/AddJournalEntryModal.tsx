
import React from 'react';
import { Save, Calculator } from 'lucide-react';
import { JournalEntryFormData } from '../../types/index';
import { cn } from '../../../../core/utils';
import { useJournalEntryForm } from '../../hooks/useJournalEntryForm';
import JournalEntryTable from './JournalEntryTable';
import JournalEntryTotals from './JournalEntryTotals';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';

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

    const footer = (
        <>
            <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
            >
                إلغاء
            </Button>
            <Button
                type="submit"
                form="add-journal-entry-form"
                variant="success"
                size="md"
                disabled={!isBalanced || isSubmitting}
                isLoading={isSubmitting}
                leftIcon={<Save size={16} />}
            >
                حفظ وترحيل القيد
            </Button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            icon={Calculator}
            title="قيد يومية جديد"
            description="إنشاء قيد محاسبي يدوي في دفتر اليومية"
            size="2xl"
            footer={footer}
        >
            <form
                id="add-journal-entry-form"
                onSubmit={handleSubmit}
                className="flex flex-col"
            >
                <div className="flex-1 space-y-4">

                    {/* Header Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 max-md:gap-3 bg-[var(--app-surface-hover)] p-3 md:p-4 border border-[var(--app-border)]">
                        <div className="md:col-span-1 space-y-1.5">
                            <label className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest">تاريخ القيد</label>
                            <input
                                type="date"
                                {...register('date', { required: true })}
                                className="w-full px-3 py-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius)] text-[var(--app-text)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none transition-all text-sm"
                                dir="ltr"
                            />
                        </div>

                        <div className="md:col-span-1 space-y-1.5">
                            <label className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest">العملة</label>
                            <select
                                {...register('currency_code')}
                                className="w-full px-3 py-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius)] text-[var(--app-text)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none transition-all text-sm"
                            >
                                {currencies.data?.map((c: any) => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest">سعر الصرف {selectedCurrency !== 'SAR' && (isDivide ? '(القسمة ÷)' : '(الضرب ×)')}</label>
                            <input
                                type="number"
                                step="0.000001"
                                disabled={selectedCurrency === 'SAR'}
                                value={exchangeRate || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setValue('exchange_rate', val || 1, { shouldValidate: true });
                                }}
                                className="w-full px-3 py-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[var(--radius)] text-[var(--app-text)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none transition-all disabled:opacity-50 font-mono text-sm"
                                dir="ltr"
                            />
                        </div>

                        <div className="md:col-span-4 space-y-1.5">
                            <label className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest">البيان (الوصف العام)</label>
                            <input
                                type="text"
                                {...register('description', { required: true })}
                                className={cn("w-full px-3 py-2 bg-[var(--app-surface)] border rounded-[var(--radius)] text-[var(--app-text)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none transition-all text-sm", errors.description ? "border-rose-500" : "border-[var(--app-border)]")}
                            />
                            {errors.description && <p className="text-[10px] text-rose-500 font-bold px-1">{errors.description.message || 'مطلوب'}</p>}
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
            </form>
        </Modal>
    );
};


export default AddJournalEntryModal;
