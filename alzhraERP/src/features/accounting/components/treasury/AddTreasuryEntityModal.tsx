import React, { useState } from 'react';
import { X, Wallet, Building2, Loader2 } from 'lucide-react';
import { useTreasuryMutations } from '../../hooks/useTreasury';

type EntityType = 'cashbox' | 'exchange';

interface AddTreasuryEntityModalProps {
    type: EntityType;
    onClose: () => void;
}

const CURRENCIES = ['SAR', 'YER', 'USD', 'OMR', 'CNY', 'EUR'];

export const AddTreasuryEntityModal: React.FC<AddTreasuryEntityModalProps> = ({ type, onClose }) => {
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('SAR');
    const [openingBalance, setOpeningBalance] = useState('0');

    const { createCashbox, isCreatingCashbox, createExchangeCompany, isCreatingExchange } = useTreasuryMutations();

    const isLoading = type === 'cashbox' ? isCreatingCashbox : isCreatingExchange;
    const title = type === 'cashbox' ? 'إضافة صندوق جديد' : 'إضافة شركة صرافة';
    const Icon = type === 'cashbox' ? Wallet : Building2;
    const iconColor = type === 'cashbox' ? 'text-blue-600' : 'text-emerald-600';
    const btnColor = type === 'cashbox'
        ? 'bg-blue-600 hover:bg-blue-700'
        : 'bg-emerald-600 hover:bg-emerald-700';

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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 max-md:p-2">
            <div className="bg-[var(--app-surface)] shadow-2xl w-full max-w-md border border-[var(--app-border)]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 max-md:px-3 py-4 border-b border-[var(--app-border)]">
                    <div className="flex items-center gap-2 max-md:gap-1.5">
                        <Icon size={18} className={iconColor} />
                        <h2 className="text-base font-bold text-[var(--app-text)]">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 max-md:p-1 hover:bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] transition-colors"
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 max-md:p-3 space-y-4">

                    {/* Name */}
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--app-text-secondary)] mb-1 uppercase tracking-widest">
                            {type === 'cashbox' ? 'اسم الصندوق' : 'اسم الشركة'}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="w-full text-sm font-medium px-3 py-2 rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-bg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all text-[var(--app-text)]"
                        />
                    </div>

                    {/* Currency */}
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--app-text-secondary)] mb-1 uppercase tracking-widest">
                            العملة
                        </label>
                        <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full text-sm font-medium px-3 py-2 rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-bg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all text-[var(--app-text)]"
                        >
                            {CURRENCIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Opening Balance */}
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--app-text-secondary)] mb-1 uppercase tracking-widest">
                            الرصيد الافتتاحي (اختياري)
                        </label>
                        <input
                            type="number"
                            value={openingBalance}
                            onChange={e => setOpeningBalance(e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-full text-sm font-medium px-3 py-2 rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-bg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all text-[var(--app-text)] font-mono"
                            dir="ltr"
                        />
                    </div>

                    {/* Info note */}
                    <p className="text-[10px] text-[var(--app-text-secondary)] bg-[var(--app-surface-hover)] px-3 py-2 border border-[var(--app-border)]">
                        سيتم إنشاء حساب محاسبي مرتبط تلقائياً في شجرة الحسابات.
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 max-md:gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-bold border border-[var(--app-border)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] transition-colors rounded-[var(--radius)]"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 max-md:gap-1.5 rounded-[var(--radius)] ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed`}
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
