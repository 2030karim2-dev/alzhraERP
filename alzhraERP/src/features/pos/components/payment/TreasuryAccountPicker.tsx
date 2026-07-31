import React from 'react';
import { Wallet, Building2, Search, ShieldCheck, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { usePaymentAccounts } from '../../../accounting/hooks/usePaymentAccounts';
import type { PaymentAccount } from './paymentTypes';
import { formatBalance } from './categorizeAccounts';

interface TreasuryAccountPickerProps {
    method: 'cash' | 'exchange';
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const TreasuryAccountPicker: React.FC<TreasuryAccountPickerProps> = ({
    method, selectedAccountId, onSelectAccount, searchQuery, onSearchChange, searchInputRef
}) => {
    const { data: paymentAccounts, isLoading: isLoadingAccounts } = usePaymentAccounts();
    const accounts = (paymentAccounts || []) as unknown as PaymentAccount[];

    const cashAccounts = accounts.filter(a =>
        (a.code ?? '').startsWith('101') ||
        (a.name_ar ?? '').includes('صندوق') ||
        (a.name_ar ?? '').includes('كاش')
    );
    const exchanges = accounts.filter(a =>
        (a.code ?? '').startsWith('102') ||
        (a.name_ar ?? '').includes('صراف') ||
        (a.name_ar ?? '').includes('كريمي') ||
        (a.name_ar ?? '').includes('هويدي') ||
        (a.name_ar ?? '').includes('اهلي') ||
        (a.name_ar ?? '').includes('الأهلي') ||
        (a.name_ar ?? '').includes('المسار') ||
        (a.name_ar ?? '').includes('ذهبي') ||
        (a.name_ar ?? '').includes('سبأ') ||
        (a.name_ar ?? '').includes('امتياز') ||
        (a.name_ar ?? '').includes('وطني')
    );
    const rest = accounts.filter(a =>
        !cashAccounts.find(c => c.id === a.id) && !exchanges.find(e => e.id === a.id)
    );
    const cash = [...cashAccounts, ...rest];

    const filteredExchanges = exchanges.filter(a => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (a.name_ar ?? '').toLowerCase().includes(q) ||
            (a.code ?? '').toLowerCase().includes(q) ||
            (a.currency_code ?? '').toLowerCase().includes(q);
    });

    const displayAccounts = method === 'cash' ? cash : filteredExchanges;
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    return (
        <div className="px-4 pt-3 pb-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                <Wallet size={11} />
                {method === 'cash' ? 'الصندوق / الخزينة' : 'شركة الصرافة'}
            </label>

            {method === 'exchange' && (
                <div className="relative mb-2">
                    <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="ابحث عن شركة صرافة..."
                        className="w-full text-xs font-bold pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-400 transition-all text-slate-700 dark:text-slate-300"
                    />
                </div>
            )}

            {isLoadingAccounts ? (
                <div className="flex items-center gap-2 py-3 text-slate-400 text-xs">
                    <Loader2 size={14} className="animate-spin" />
                    جارٍ تحميل الحسابات...
                </div>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {displayAccounts.map(acc => (
                        <button
                            key={acc.id}
                            type="button"
                            onClick={() => onSelectAccount(acc.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 group",
                                selectedAccountId === acc.id
                                    ? method === 'exchange'
                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                        : "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
                            )}
                        >
                            {method === 'exchange' ? <Building2 size={11} /> : <Wallet size={11} />}
                            <span className="max-w-[100px] truncate">{acc.name_ar}</span>
                            {acc.currency_code && (
                                <span className={cn(
                                    "text-[9px] font-mono",
                                    selectedAccountId === acc.id ? 'opacity-80' : 'opacity-60'
                                )}>
                                    {acc.currency_code}
                                </span>
                            )}
                            {acc.balance !== undefined && (
                                <span className={cn(
                                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                                    selectedAccountId === acc.id
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                )}>
                                    {formatBalance(acc.balance)}
                                </span>
                            )}
                        </button>
                    ))}
                    {displayAccounts.length === 0 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                            {method === 'exchange'
                                ? 'لا توجد حسابات صرافة. يرجى إضافتها من المحاسبة ← الإعدادات.'
                                : 'لا توجد صناديق نقدية. يرجى مراجعة الحسابات.'}
                        </p>
                    )}
                </div>
            )}

            {selectedAccount && method === 'exchange' && (
                <div className="mx-4 mt-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                {selectedAccount.name_ar}
                            </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">
                            {selectedAccount.code}
                        </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                            <Wallet size={9} />
                            الرصيد: {formatBalance(selectedAccount.balance)} {selectedAccount.currency_code || ''}
                        </span>
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                            <DollarSign size={9} />
                            العملة: {selectedAccount.currency_code || ''}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TreasuryAccountPicker;