import React from 'react';
import { Wallet, Building2, Search, ShieldCheck, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '../../../../core/utils';
import {
  useCashPaymentAccounts,
  useExchangePaymentAccounts,
} from '../../../accounting/hooks/usePaymentAccounts';
import type { PaymentAccount } from '../../../accounting/hooks/usePaymentAccounts';
import { formatBalance } from './categorizeAccounts';

interface TreasuryAccountPickerProps {
  method: 'cash' | 'exchange';
  selectedAccountId: string | null;
  onSelectAccount: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  paymentCurrency?: string;
}

export const TreasuryAccountPicker: React.FC<TreasuryAccountPickerProps> = ({
  method,
  selectedAccountId,
  onSelectAccount,
  searchQuery,
  onSearchChange,
  searchInputRef,
  paymentCurrency,
}) => {
  const { data: cashAccounts, isLoading: loadingCash } = useCashPaymentAccounts();
  const { data: exchangeAccounts, isLoading: loadingExchange } = useExchangePaymentAccounts();

  const isLoadingAccounts = loadingCash || loadingExchange;

  const filteredExchanges = exchangeAccounts.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.name_ar ?? '').toLowerCase().includes(q) ||
      (a.currency_code ?? '').toLowerCase().includes(q)
    );
  });

  const sortedCashAccounts = React.useMemo(() => {
    if (!paymentCurrency) return cashAccounts;
    const norm = paymentCurrency.toUpperCase().trim();
    return [...cashAccounts].sort((a, b) => {
      const aMatch = (a.currency_code ?? '').toUpperCase() === norm ? 1 : 0;
      const bMatch = (b.currency_code ?? '').toUpperCase() === norm ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [cashAccounts, paymentCurrency]);

  const displayAccounts: PaymentAccount[] =
    method === 'cash' ? sortedCashAccounts : filteredExchanges;
  const allAccounts = [...cashAccounts, ...exchangeAccounts];
  const selectedAccount = allAccounts.find(a => a.id === selectedAccountId);

  return (
    <div className="px-4 pb-1 pt-3">
      <label className="mb-2 block flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
            onChange={e => {
              onSearchChange(e.target.value);
            }}
            placeholder="ابحث عن شركة صرافة..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-xs font-bold text-slate-700 outline-none transition-all focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
          />
        </div>
      )}

      {isLoadingAccounts ? (
        <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          جارٍ تحميل الحسابات...
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {displayAccounts.map(acc => (
            <button
              key={acc.id}
              type="button"
              onClick={() => {
                onSelectAccount(acc.id);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all active:scale-95',
                selectedAccountId === acc.id
                  ? method === 'exchange'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950/20'
              )}
            >
              {method === 'exchange' ? <Building2 size={11} /> : <Wallet size={11} />}
              <span className="max-w-[100px] truncate">{acc.name_ar}</span>
              {acc.currency_code && (
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    selectedAccountId === acc.id ? 'opacity-80' : 'opacity-60'
                  )}
                >
                  {acc.currency_code}
                </span>
              )}
              {acc.balance !== undefined && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                    selectedAccountId === acc.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {formatBalance(acc.balance)}
                </span>
              )}
            </button>
          ))}
          {displayAccounts.length === 0 && (
            <p className="py-2 text-xs text-slate-400 dark:text-slate-500">
              {method === 'exchange'
                ? 'لا توجد شركات صرافة. يرجى إضافتها من المحاسبة ← الخزينة.'
                : 'لا توجد صناديق نقدية. يرجى إضافتها من المحاسبة ← الخزينة.'}
            </p>
          )}
        </div>
      )}

      {selectedAccount && method === 'exchange' && (
        <div className="mx-4 mt-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              {selectedAccount.name_ar}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Wallet size={9} />
              الرصيد: {formatBalance(selectedAccount.balance)} {selectedAccount.currency_code || ''}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
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
