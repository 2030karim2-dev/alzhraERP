import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { JournalEntryFormData } from '../../types/index';
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
  isLoadingAccounts,
}) => {
  return (
    <div className="overflow-hidden border border-[var(--app-border)] shadow-sm transition-colors">
      <div className="grid grid-cols-12 gap-4 bg-[var(--app-surface-hover)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)] max-md:gap-3">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-3">الحساب</div>
        <div className="col-span-4">البيان (اختياري)</div>
        <div className="col-span-2 text-start">مدين</div>
        <div className="col-span-2 text-start">دائن</div>
      </div>

      <div className="divide-y divide-[var(--app-border)] bg-[var(--app-surface)]">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="group grid grid-cols-12 items-start gap-4 px-4 py-3 transition-colors hover:bg-[var(--app-surface-hover)] max-md:gap-3"
          >
            <div className="col-span-1 flex items-center justify-center pt-2">
              <span
                dir="ltr"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface-hover)] text-xs font-bold text-[var(--app-text-secondary)]"
              >
                {index + 1}
              </span>
            </div>

            <div className="col-span-3">
              {isLoadingAccounts ? (
                <div className="animate-pulse p-2 text-xs text-[var(--app-text-secondary)]">
                  جاري التحميل...
                </div>
              ) : (
                <SearchableAccountSelector
                  accounts={accounts || []}
                  selectedId={fields[index].account_id}
                  onSelect={(id: string) => {
                    setValue(`lines.${index}.account_id`, id, { shouldValidate: true });
                  }}
                  className="w-full"
                  postableOnly
                />
              )}
              {errors.lines?.[index]?.account_id && (
                <p className="mt-0.5 px-1 text-[10px] font-bold text-rose-500">
                  {errors.lines[index]?.account_id?.message}
                </p>
              )}
            </div>

            <div className="col-span-4">
              <input
                type="text"
                {...register(`lines.${index}.description` as const)}
                className="w-full rounded-[var(--radius)] border border-transparent bg-transparent px-2 py-2 text-sm text-[var(--app-text)] outline-none transition-all hover:border-[var(--app-border)] focus:border-[var(--accent)]"
              />
            </div>

            <div className="col-span-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register(`lines.${index}.debit_amount` as const, {
                  valueAsNumber: true,
                  onChange: e => {
                    const val = parseFloat(e.target.value);
                    if (val > 0)
                      setValue(`lines.${index}.credit_amount`, 0, { shouldValidate: true });
                  },
                })}
                className="w-full rounded-[var(--radius)] border border-transparent bg-emerald-50/10 px-2 py-2 text-start font-mono text-sm text-emerald-700 outline-none hover:border-emerald-200 focus:border-[var(--accent)] dark:bg-emerald-900/5 dark:text-emerald-400 dark:hover:border-emerald-900/30"
                dir="ltr"
              />
            </div>

            <div className="relative col-span-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register(`lines.${index}.credit_amount` as const, {
                  valueAsNumber: true,
                  onChange: e => {
                    const val = parseFloat(e.target.value);
                    if (val > 0)
                      setValue(`lines.${index}.debit_amount`, 0, { shouldValidate: true });
                  },
                })}
                className="w-full rounded-[var(--radius)] border border-transparent bg-red-50/10 px-2 py-2 text-start font-mono text-sm text-red-700 outline-none hover:border-red-200 focus:border-[var(--accent)] dark:bg-red-900/5 dark:text-red-400 dark:hover:border-red-900/30"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => {
                  remove(index);
                }}
                className="absolute -end-10 top-2 rounded-[var(--radius)] p-1.5 text-[var(--app-text-secondary)] opacity-50 transition-all hover:bg-rose-50 hover:text-rose-500 hover:opacity-100 group-hover:opacity-100 dark:hover:bg-rose-900/20 max-md:opacity-100"
                aria-label="حذف السطر"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          append({ account_id: '', description: '', debit_amount: 0, credit_amount: 0 });
        }}
        className="flex w-full items-center justify-center gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] py-3 text-sm font-bold text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-border)]"
      >
        <Plus size={18} />
        <span>إضافة صف جديد</span>
      </button>
    </div>
  );
};

export default JournalEntryTable;
