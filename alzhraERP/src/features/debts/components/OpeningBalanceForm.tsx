import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useUpsertOpeningBalance } from '../hooks/useDebtMutations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partyId: string;
  existingAmount?: number;
  existingDirection?: string;
  existingCurrency?: string;
}

const OpeningBalanceForm: React.FC<Props> = ({ isOpen, onClose, partyId, existingAmount, existingDirection, existingCurrency }) => {
  const { t } = useTranslation();
  const upsert = useUpsertOpeningBalance();
  const [form, setForm] = useState({
    currency_code: existingCurrency || 'SAR',
    amount: existingAmount?.toString() || '',
    direction: existingDirection || 'debit',
    entry_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.currency_code) return;
    upsert.mutate(
      { party_id: partyId, currency_code: form.currency_code, amount: parseFloat(form.amount), direction: form.direction as 'debit'|'credit', entry_date: form.entry_date, reference_number: form.reference_number || undefined, notes: form.notes || undefined },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-[var(--app-text)]">📊 {t('opening_balance') || 'رصيد افتتاحي'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('currency')}</label>
              <select value={form.currency_code} onChange={e => setForm({...form, currency_code: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="SAR">SAR</option><option value="YER">YER</option><option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('amount')}</label>
              <input type="number" step="0.01" min="0" required value={form.amount}
                onChange={e => setForm({...form, amount: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('direction') || 'الاتجاه'}</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({...form, direction: 'debit'})}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.direction === 'debit' ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 text-[var(--app-text-secondary)]'}`}>
                {t('debit') || 'مدين (عليه)'}
              </button>
              <button type="button" onClick={() => setForm({...form, direction: 'credit'})}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.direction === 'credit' ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600 text-[var(--app-text-secondary)]'}`}>
                {t('credit') || 'دائن (له)'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('date')}</label>
              <input type="date" required value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('reference') || 'المرجع'}</label>
              <input type="text" value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('notes')}</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"/>
          </div>
          <button type="submit" disabled={upsert.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4"/>{upsert.isPending ? t('saving') : t('save')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OpeningBalanceForm;
