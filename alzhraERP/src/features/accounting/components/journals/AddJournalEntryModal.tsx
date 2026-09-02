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

const AddJournalEntryModal: React.FC<AddJournalEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
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
    isBalanced,
  } = useJournalEntryForm(onSubmit, isOpen);

  const footer = (
    <>
      <Button type="button" variant="ghost" size="md" onClick={onClose}>
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
      <form id="add-journal-entry-form" onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex-1 space-y-4">
          {/* Header Fields */}
          <div className="grid grid-cols-1 gap-3 border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3 max-md:gap-3 md:grid-cols-4 md:p-4">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
                تاريخ القيد
              </label>
              <input
                type="date"
                {...register('date', { required: true })}
                className="focus:ring-[var(--accent)]/20 w-full rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
                العملة
              </label>
              <select
                {...register('currency_code')}
                className="focus:ring-[var(--accent)]/20 w-full rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2"
              >
                {currencies.data?.map((c: any) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
                سعر الصرف {selectedCurrency !== 'SAR' && (isDivide ? '(القسمة ÷)' : '(الضرب ×)')}
              </label>
              <input
                type="number"
                step="0.000001"
                disabled={selectedCurrency === 'SAR'}
                value={exchangeRate || ''}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setValue('exchange_rate', val || 1, { shouldValidate: true });
                }}
                className="focus:ring-[var(--accent)]/20 w-full rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 font-mono text-sm text-[var(--app-text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 disabled:opacity-50"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5 md:col-span-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
                البيان (الوصف العام)
              </label>
              <input
                type="text"
                {...register('description', { required: true })}
                className={cn(
                  'focus:ring-[var(--accent)]/20 w-full rounded-[var(--radius)] border bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2',
                  errors.description ? 'border-rose-500' : 'border-[var(--app-border)]'
                )}
              />
              {errors.description && (
                <p className="px-1 text-[10px] font-bold text-rose-500">
                  {errors.description.message || 'مطلوب'}
                </p>
              )}
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
