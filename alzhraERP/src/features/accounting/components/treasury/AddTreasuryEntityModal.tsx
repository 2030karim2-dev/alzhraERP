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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50  max-md:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-md:rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">

                {/* Header */}
                <div className="flex items-center justify-between px-6 max-md:px-3 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center  max-md:gap-2">
                        <Icon size={18} className={iconColor} />
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className=" max-md:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 max-md:p-3 space-y-4">

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                            {type === 'cashbox' ? 'اسم الصندوق' : 'اسم الشركة'}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={type === 'cashbox' ? 'مثال: صندوق الريال السعودي' : 'مثال: شركة الكريمي للصرافة'}
                            required
                            className="w-full text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-400 transition-all text-slate-700 dark:text-slate-300"
                        />
                    </div>

                    {/* Currency */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                            العملة
                        </label>
                        <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-400 transition-all text-slate-700 dark:text-slate-300"
                        >
                            {CURRENCIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Opening Balance */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                            الرصيد الافتتاحي (اختياري)
                        </label>
                        <input
                            type="number"
                            value={openingBalance}
                            onChange={e => setOpeningBalance(e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-full text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-400 transition-all text-slate-700 dark:text-slate-300"
                        />
                    </div>

                    {/* Info note */}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
                        سيتم إنشاء حساب محاسبي مرتبط تلقائياً في شجرة الحسابات.
                    </p>

                    {/* Actions */}
                    <div className="flex  max-md:gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center  max-md:gap-2 ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed`}
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
