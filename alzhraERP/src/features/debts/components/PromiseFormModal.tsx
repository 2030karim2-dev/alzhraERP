import React, { useState, useEffect } from 'react';
import { X, Handshake } from 'lucide-react';
import { useParties } from '../../parties/hooks';
import { useCurrencies } from '../../settings/hooks';
import { useDebtMutations } from '../hooks/useDebtMutations';
import type { PaymentPromise } from '../types';

interface PromiseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyId?: string | null;
  partyName?: string | null;
  promise?: PaymentPromise | null;
}

interface PromiseFormState {
  party_id: string;
  amount: string;
  currency_code: string;
  promise_date: string;
  notes: string;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const inputClass =
  'w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-60';

const FieldLabel: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({
  htmlFor,
  children,
}) => (
  <label
    htmlFor={htmlFor}
    className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5"
  >
    {children}
  </label>
);

const PartyField: React.FC<{
  id: string;
  value: string;
  disabled: boolean;
  parties: Array<{ id: string; name: string }>;
  onChange: (value: string) => void;
}> = ({ id, value, disabled, parties, onChange }) => (
  <div>
    <FieldLabel htmlFor={id}>العميل *</FieldLabel>
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className={inputClass}
    >
      <option value="">اختر العميل...</option>
      {parties.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  </div>
);

const MoneyFields: React.FC<{
  amountId: string;
  currencyId: string;
  amount: string;
  currencyCode: string;
  currencies: Array<{ code: string; name_ar: string }> | null;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
}> = ({ amountId, currencyId, amount, currencyCode, currencies, onAmountChange, onCurrencyChange }) => (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <FieldLabel htmlFor={amountId}>المبلغ *</FieldLabel>
      <input
        id={amountId}
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => {
          onAmountChange(e.target.value);
        }}
        placeholder="0.00"
        className={inputClass}
      />
    </div>
    <div>
      <FieldLabel htmlFor={currencyId}>العملة</FieldLabel>
      <select
        id={currencyId}
        value={currencyCode}
        onChange={(e) => {
          onCurrencyChange(e.target.value);
        }}
        className={inputClass}
      >
        {currencies?.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.name_ar}
          </option>
        ))}
      </select>
    </div>
  </div>
);

const DateField: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, value, onChange }) => (
  <div>
    <FieldLabel htmlFor={id}>تاريخ الوفاء *</FieldLabel>
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className={inputClass}
    />
  </div>
);

const NotesField: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, value, onChange }) => (
  <div>
    <FieldLabel htmlFor={id}>ملاحظات</FieldLabel>
    <textarea
      id={id}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      rows={2}
      className={inputClass}
    />
  </div>
);

// ── Main modal ──

const PromiseFormModal: React.FC<PromiseFormModalProps> = ({
  isOpen,
  onClose,
  partyId,
  partyName,
  promise,
}) => {
  const { data: parties } = useParties('customer');
  const { currencies } = useCurrencies();
  const { createPromise, updatePromise, isSaving } = useDebtMutations();

  const [form, setForm] = useState<PromiseFormState>({
    party_id: partyId ?? '',
    amount: promise ? String(promise.amount) : '',
    currency_code: promise?.currency_code ?? 'SAR',
    promise_date: promise?.promise_date ?? todayISO(),
    notes: promise?.notes ?? '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        party_id: partyId ?? promise?.party_id ?? '',
        amount: promise ? String(promise.amount) : '',
        currency_code: promise?.currency_code ?? 'SAR',
        promise_date: promise?.promise_date ?? todayISO(),
        notes: promise?.notes ?? '',
      });
    }
  }, [isOpen, promise, partyId]);

  if (!isOpen) return null;

  const set = <K extends keyof PromiseFormState>(key: K, value: PromiseFormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (): void => {
    const amount = Number(form.amount);
    if (!form.party_id || !form.promise_date || !(amount > 0)) return;

    const payload = {
      party_id: form.party_id,
      amount,
      currency_code: form.currency_code || 'SAR',
      promise_date: form.promise_date,
      notes: form.notes.trim() || null,
    };

    if (promise) {
      updatePromise({ id: promise.id, payload });
    } else {
      createPromise(payload);
    }
    onClose();
  };

  const selectedPartyName = parties?.find((p) => p.id === form.party_id)?.name ?? partyName ?? '';
  const currencyOptions = (currencies.data as Array<{ code: string; name_ar: string }> | null) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--app-surface)] rounded-2xl shadow-2xl w-full max-w-md max-md:mx-2 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 max-md:p-2.5 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
              <Handshake size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm">{promise ? 'تعديل الوعد' : 'وعد سداد جديد'}</h3>
              {selectedPartyName ? <p className="text-[10px] text-gray-500">{selectedPartyName}</p> : null}
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 max-md:p-2.5 space-y-4 max-md:space-y-2.5">
          <PartyField
            id="promise-party"
            value={form.party_id}
            disabled={!!partyId || !!promise}
            parties={(parties ?? [])}
            onChange={(v) => {
              set('party_id', v);
            }}
          />
          <MoneyFields
            amountId="promise-amount"
            currencyId="promise-currency"
            amount={form.amount}
            currencyCode={form.currency_code}
            currencies={currencyOptions}
            onAmountChange={(v) => {
              set('amount', v);
            }}
            onCurrencyChange={(v) => {
              set('currency_code', v);
            }}
          />
          <DateField
            id="promise-date"
            value={form.promise_date}
            onChange={(v) => {
              set('promise_date', v);
            }}
          />
          <NotesField
            id="promise-notes"
            value={form.notes}
            onChange={(v) => {
              set('notes', v);
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-2 p-4 max-md:p-2.5 border-t border-gray-200 dark:border-slate-800">
          <button
            onClick={() => {
              onClose();
            }}
            className="px-4 max-md:px-2.5 py-2 max-md:py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.party_id || !(Number(form.amount) > 0) || !form.promise_date || isSaving}
            className="px-4 max-md:px-2.5 py-2 max-md:py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {promise ? 'حفظ التعديل' : 'تسجيل الوعد'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromiseFormModal;

