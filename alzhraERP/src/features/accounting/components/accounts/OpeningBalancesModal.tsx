import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Scale, Search } from 'lucide-react';
// Fix: Corrected import path to point to the barrel file.
import { useAccounts, useJournalMutation } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import Spinner from '../../../../ui/base/Spinner';

interface OpeningBalancesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OpeningBalanceLine {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
}

interface FormData {
  lines: OpeningBalanceLine[];
  date: string;
}

const OpeningBalancesModal: React.FC<OpeningBalancesModalProps> = ({ isOpen, onClose }) => {
  const { data: accounts, isLoading } = useAccounts();
  const { createJournal, isCreating } = useJournalMutation();
  const [filter, setFilter] = useState('');

  const { control, register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      lines: [],
    },
  });

  const { fields, replace } = useFieldArray({ control, name: 'lines' });

  useEffect(() => {
    if (isOpen && accounts) {
      // Only show leaf accounts (accounts without children)
      const leafAccounts = accounts.filter(acc => !accounts.some(a => a.parent_id === acc.id));
      replace(
        leafAccounts.map(acc => ({
          account_id: acc.id,
          debit_amount: 0,
          credit_amount: 0,
        }))
      );
    }
  }, [isOpen, accounts, replace]);

  const watchedLines = watch('lines');

  const totals = (watchedLines || []).reduce(
    (acc, curr) => ({
      debit_amount: acc.debit_amount + (Number(curr.debit_amount) || 0),
      credit_amount: acc.credit_amount + (Number(curr.credit_amount) || 0),
    }),
    { debit_amount: 0, credit_amount: 0 }
  );

  const difference = totals.debit_amount - totals.credit_amount;
  const isBalanced = Math.abs(difference) < 0.01;

  const onSubmit = (data: FormData) => {
    const filteredLines = data.lines
      .filter(line => Number(line.debit_amount) > 0 || Number(line.credit_amount) > 0)
      .map(line => ({
        account_id: line.account_id,
        debit_amount: Number(line.debit_amount) || 0,
        credit_amount: Number(line.credit_amount) || 0,
        description: 'رصيد افتتاحي',
      }));

    if (filteredLines.length === 0 || !isBalanced) return;

    createJournal(
      {
        date: data.date,
        description: 'القيد الافتتاحي للأرصدة (Micro-UI Sync)',
        reference_type: 'opening_balance',
        lines: filteredLines,
      },
      { onSuccess: onClose }
    );
  };

  const filteredFields = fields
    .map((field, index) => ({ ...field, index }))
    .filter(
      field =>
        accounts
          ?.find(acc => acc.id === field.account_id)
          ?.name.toLowerCase()
          .includes(filter.toLowerCase()) ||
        accounts?.find(acc => acc.id === field.account_id)?.code.includes(filter)
    );

  const footer = (
    <div className="flex w-full items-center justify-between px-1">
      <div className="flex gap-3 max-md:gap-2">
        <div className="flex flex-col text-start">
          <span className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
            الفرق
          </span>
          <span
            dir="ltr"
            className={`font-mono text-[11px] font-bold ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {formatCurrency(Math.abs(difference))}
          </span>
        </div>
        <div className="flex flex-col text-start">
          <span className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
            إجمالي المدين
          </span>
          <span dir="ltr" className="font-mono text-[11px] font-bold text-[var(--app-text)]">
            {formatCurrency(totals.debit_amount)}
          </span>
        </div>
        <div className="flex flex-col text-start">
          <span className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
            إجمالي الدائن
          </span>
          <span dir="ltr" className="font-mono text-[11px] font-bold text-[var(--app-text)]">
            {formatCurrency(totals.credit_amount)}
          </span>
        </div>
      </div>
      <div className="flex gap-1 max-md:gap-1">
        <Button variant="ghost" size="sm" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          isLoading={isCreating}
          disabled={!isBalanced || isCreating}
          variant="primary"
          size="sm"
        >
          اعتماد الأرصدة
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Scale}
      title="الأرصدة الافتتاحية"
      description="Micro-Grid Account Entry"
      footer={footer}
    >
      <div className="flex h-[500px] flex-col">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2 max-md:gap-2 max-md:p-1.5">
          <div className="relative flex-1">
            <Search
              className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]"
              size={12}
            />
            <input
              type="text"
              placeholder="بحث سريع..."
              value={filter}
              onChange={e => {
                setFilter(e.target.value);
              }}
              className="w-full rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-surface)] py-1.5 pe-2 ps-7 text-[10px] font-bold text-[var(--app-text)] outline-none"
            />
          </div>
          <input
            type="date"
            {...register('date')}
            className="w-28 rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5 text-[10px] font-bold text-[var(--app-text)] outline-none"
            dir="ltr"
          />
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-20 text-center max-md:p-6">
              <Spinner />
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
                <tr>
                  <th className="p-2 text-start max-md:p-1.5">الحساب</th>
                  <th className="w-20 bg-emerald-50/20 p-2 text-start max-md:p-1.5">مدين</th>
                  <th className="w-20 bg-rose-50/20 p-2 text-start max-md:p-1.5">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {filteredFields.map(field => {
                  const account = accounts?.find(acc => acc.id === field.account_id);
                  return (
                    <tr
                      key={field.id}
                      className="transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/5"
                    >
                      <td className="p-2 max-md:p-1.5">
                        <div className="text-[10px] font-bold text-[var(--app-text)]">
                          {account?.name}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                          {account?.code}
                        </div>
                      </td>
                      <td className="border-s border-[var(--app-border)] p-0 max-md:p-0">
                        <input
                          type="number"
                          step="0.01"
                          {...register(`lines.${field.index}.debit_amount`, {
                            valueAsNumber: true,
                          })}
                          className="h-full w-full bg-transparent p-2 font-mono text-[10px] font-bold text-emerald-600 outline-none focus:bg-emerald-50 dark:focus:bg-emerald-900/10 max-md:p-1.5"
                          dir="ltr"
                          onChange={e => {
                            if (parseFloat(e.target.value) > 0)
                              setValue(`lines.${field.index}.credit_amount`, 0);
                          }}
                        />
                      </td>
                      <td className="p-0 max-md:p-0">
                        <input
                          type="number"
                          step="0.01"
                          {...register(`lines.${field.index}.credit_amount`, {
                            valueAsNumber: true,
                          })}
                          className="h-full w-full bg-transparent p-2 font-mono text-[10px] font-bold text-rose-600 outline-none focus:bg-rose-50 dark:focus:bg-rose-900/10 max-md:p-1.5"
                          dir="ltr"
                          onChange={e => {
                            if (parseFloat(e.target.value) > 0)
                              setValue(`lines.${field.index}.debit_amount`, 0);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OpeningBalancesModal;
