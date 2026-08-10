import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useCreatePromise } from '../hooks/useDebtMutations';
import type { PaymentPromiseInsert } from '@/core/database/types/debt.types';

interface PromiseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyId: string;
  currencyCode?: string;
}

const PromiseFormModal: React.FC<PromiseFormModalProps> = ({ isOpen, onClose, partyId, currencyCode }) => {
  const { t } = useTranslation();
  const createPromise = useCreatePromise();

  const [form, setForm] = useState({
    amount: '',
    currency_code: currencyCode || 'SAR',
    promise_date: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.promise_date) return;

    createPromise.mutate(
      {
        party_id: partyId,
        amount: parseFloat(form.amount),
        currency_code: form.currency_code,
        promise_date: form.promise_date,
        notes: form.notes || undefined,
        status: 'pending',
      },
      {
        onSuccess: () => {
          setForm({ amount: '', currency_code: currencyCode || 'SAR', promise_date: '', notes: '' });
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-[var(--app-text)]">📝 {t('add_promise')}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--app-text)]">{t('amount')}</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--app-text)] text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--app-text)]">{t('currency')}</label>
            <select
              value={form.currency_code}
              onChange={e => setForm({ ...form, currency_code: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--app-text)] text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="SAR">SAR - ريال سعودي</option>
              <option value="YER">YER - ريال يمني</option>
              <option value="USD">USD - دولار أمريكي</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--app-text)]">{t('promise_date')}</label>
            <input
              type="date" required
              value={form.promise_date}
              onChange={e => setForm({ ...form, promise_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--app-text)] text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--app-text)]">{t('notes')}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--app-text)] text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder={t('notes')}
            />
          </div>

          <button
            type="submit"
            disabled={createPromise.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {createPromise.isPending ? t('saving') : t('save')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PromiseFormModal;
