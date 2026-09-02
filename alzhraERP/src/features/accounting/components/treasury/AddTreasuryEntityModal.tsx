import React, { useState } from 'react';
import { X, Wallet, Building2, Loader2 } from 'lucide-react';
import { useTreasuryMutations } from '../../hooks/useTreasury';

type EntityType = 'cashbox' | 'exchange';

interface AddTreasuryEntityModalProps {
  type: EntityType;
  onClose: () => void;
}

const CURRENCIES = ['SAR', 'YER', 'USD', 'OMR', 'CNY', 'EUR'];

export const AddTreasuryEntityModal: React.FC<AddTreasuryEntityModalProps> = ({
  type,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [openingBalance, setOpeningBalance] = useState('0');

  const { createCashbox, isCreatingCashbox, createExchangeCompany, isCreatingExchange } =
    useTreasuryMutations();

  const isLoading = type === 'cashbox' ? isCreatingCashbox : isCreatingExchange;
  const title = type === 'cashbox' ? 'إضافة صندوق جديد' : 'إضافة شركة صرافة';
  const Icon = type === 'cashbox' ? Wallet : Building2;
  const iconColor = type === 'cashbox' ? 'text-blue-600' : 'text-emerald-600';
  const btnColor =
    type === 'cashbox' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const input = {
      name: name.trim(),
      currency_code: currency,
      opening_balance: parseFloat(openingBalance) || 0,
    };

    if (type === 'cashbox') {
      createCashbox(input, { onSuccess: onClose });
    } else {
      createExchangeCompany(input, { onSuccess: onClose });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm max-md:p-2">
      <div className="w-full max-w-md border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-6 py-4 max-md:px-3">
          <div className="flex items-center gap-2 max-md:gap-1.5">
            <Icon size={18} className={iconColor} />
            <h2 className="text-base font-bold text-[var(--app-text)]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)] max-md:p-1"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6 max-md:p-3">
          {/* Name */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
              {type === 'cashbox' ? 'اسم الصندوق' : 'اسم الشركة'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
              }}
              required
              className="focus:ring-[var(--accent)]/20 w-full rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm font-medium text-[var(--app-text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
              العملة
            </label>
            <select
              value={currency}
              onChange={e => {
                setCurrency(e.target.value);
              }}
              className="focus:ring-[var(--accent)]/20 w-full rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm font-medium text-[var(--app-text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2"
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Opening Balance */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
              الرصيد الافتتاحي (اختياري)
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={e => {
                setOpeningBalance(e.target.value);
              }}
              min="0"
              step="0.01"
              className="focus:ring-[var(--accent)]/20 w-full rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 font-mono text-sm font-medium text-[var(--app-text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2"
              dir="ltr"
            />
          </div>

          {/* Info note */}
          <p className="border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-2 text-[10px] text-[var(--app-text-secondary)]">
            سيتم إنشاء حساب محاسبي مرتبط تلقائياً في شجرة الحسابات.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2 max-md:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[var(--radius)] border border-[var(--app-border)] px-4 py-2.5 text-sm font-bold text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm font-bold text-white transition-all max-md:gap-1.5 ${btnColor} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  جارٍ الإنشاء...
                </>
              ) : (
                <>
                  <Icon size={14} />
                  إنشاء {type === 'cashbox' ? 'الصندوق' : 'الشركة'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTreasuryEntityModal;
