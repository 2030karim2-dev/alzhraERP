import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  Hash,
  CreditCard,
  Banknote,
  Warehouse,
  Wallet,
  Coins,
  ArrowRightLeft,
  User,
  ChevronDown,
  Search,
  Check,
  Building2,
} from 'lucide-react';
import { useSalesStore } from '../../store';
import { usePaymentAccounts } from '../../../accounting/hooks/index';
import { useWarehouses } from '../../../inventory/hooks/useInventoryManagement';
import { useCurrencies } from '../../../settings/hooks';
import CustomerSelector from './CustomerSelector';
import { cn } from '../../../../core/utils';

interface Props {
  invoiceNumber?: string;
}

const InvoiceMeta: React.FC<Props> = ({ invoiceNumber }) => {
  const {
    invoiceType,
    currency,
    exchangeRate,
    exchangeOperator,
    warehouseId,
    cashboxId,
    setMetadata,
  } = useSalesStore();

  const { data: paymentAccounts } = usePaymentAccounts();
  const { data: warehouses } = useWarehouses();
  const { currencies, rates } = useCurrencies();
  const prevCurrency = useRef(currency);
  const ratesLoaded = useRef(false);

  // Treasury dropdown state
  const [isTreasuryOpen, setIsTreasuryOpen] = useState(false);
  const [treasurySearch, setTreasurySearch] = useState('');
  const treasuryRef = useRef<HTMLDivElement>(null);

  // Close treasury dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (treasuryRef.current && !treasuryRef.current.contains(event.target as Node)) {
        setIsTreasuryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const currencyChanged = prevCurrency.current !== currency;
    const ratesJustLoaded = !ratesLoaded.current && Boolean(rates.data);

    if ((currencyChanged || ratesJustLoaded) && rates.data) {
      if (currency === 'SAR') {
        setMetadata('exchangeRate', 1);
        setMetadata('exchangeOperator', 'multiply');
      } else {
        const rateObj = (
          rates.data as Array<{ currency_code: string; rate_to_base: number }>
        )?.find(r => r.currency_code === currency);
        if (rateObj) {
          setMetadata('exchangeRate', rateObj.rate_to_base);
          const currencyConfig = (
            currencies.data as Array<{ code: string; exchange_operator: string }>
          )?.find(c => c.code === currency);
          if (currencyConfig) {
            setMetadata('exchangeOperator', currencyConfig.exchange_operator);
          }
        }
      }
    }

    if (rates.data) {
      ratesLoaded.current = true;
    }

    // Auto-Treasury (Cashbox) Selection on currency change
    if (currencyChanged && paymentAccounts && paymentAccounts.length > 0) {
      const searchTerms =
        currency === 'SAR' ? ['SAR', 'سعودي', 'ريال سعودي'] : ['YER', 'يمني', 'ريال يمني'];
      const matchingAccount = paymentAccounts.find(
        acc =>
          acc.currency_code === currency ||
          searchTerms.some(term => acc.name_ar.toLowerCase().includes(term.toLowerCase()))
      );

      if (matchingAccount) {
        setMetadata('cashboxId', matchingAccount.id);
      }
    }

    // Default primary warehouse selection
    if (warehouses && warehouses.length > 0 && (warehouseId === 'wh_main' || !warehouseId)) {
      const castWarehouses = warehouses as Array<Record<string, unknown>>;
      const primary = castWarehouses.find(w => w.is_primary);
      const target = primary || castWarehouses[0];
      if (target?.id) {
        setMetadata('warehouseId', target.id as string);
      }
    }

    prevCurrency.current = currency;
  }, [
    currency,
    paymentAccounts,
    rates.data,
    warehouses,
    warehouseId,
    currencies.data,
    setMetadata,
  ]);

  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  // Find currently selected treasury account
  const selectedAccount = useMemo(() => {
    return paymentAccounts?.find(a => a.id === cashboxId);
  }, [paymentAccounts, cashboxId]);

  // Filter treasury accounts
  const filteredAccounts = useMemo(() => {
    if (!paymentAccounts) return [];
    if (!treasurySearch.trim()) return paymentAccounts;
    const term = treasurySearch.toLowerCase().trim();
    return paymentAccounts.filter(
      a =>
        a.name_ar.toLowerCase().includes(term) ||
        (a.code && a.code.toLowerCase().includes(term)) ||
        (a.currency_code && a.currency_code.toLowerCase().includes(term))
    );
  }, [paymentAccounts, treasurySearch]);

  return (
    <div className="relative z-30 border-b border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="grid grid-cols-1 gap-3 text-xs lg:grid-cols-12">
        {/* 1. Customer Selection Card (Span 4 cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-750 dark:bg-slate-850 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <User size={14} />
              <span className="text-[11px] font-black uppercase tracking-wider">بيانات العميل</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">اختيار أو بحث ذكي</span>
          </div>

          <div className="w-full">
            <CustomerSelector />
          </div>
        </div>

        {/* 2. Payment Terms & Invoice Meta Card (Span 4 cols) */}
        <div className="flex flex-col justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-750 dark:bg-slate-850 lg:col-span-4">
          {/* Top row: Invoice # and Issue Date */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Hash size={12} className="text-blue-500" />
                <span className="text-[10px] font-bold">رقم الفاتورة</span>
              </div>
              <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">
                #{invoiceNumber || '---'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Calendar size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold">تاريخ التحرير</span>
              </div>
              <span
                dir="ltr"
                className="block text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {date}
              </span>
            </div>
          </div>

          {/* Payment Method Toggle Pills */}
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-slate-400">
              <CreditCard size={12} className="text-amber-500" />
              <span className="text-[10px] font-bold">طريقة السداد</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200/60 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setMetadata('invoiceType', 'cash');
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-black transition-all',
                  invoiceType === 'cash'
                    ? 'border border-slate-200/60 bg-white text-emerald-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Banknote size={14} />
                <span>نقداً (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMetadata('invoiceType', 'credit');
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-black transition-all',
                  invoiceType === 'credit'
                    ? 'border border-slate-200/60 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <CreditCard size={14} />
                <span>آجل (Credit)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Currency, Cashbox & Warehouse Control (Span 4 cols) */}
        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-750 dark:bg-slate-850 lg:col-span-4">
          {/* Row 1: Currency and FX */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Coins size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold">العملة</span>
              </div>
              <select
                value={currency || 'SAR'}
                onChange={e => {
                  setMetadata('currency', e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {(currencies.data as Array<{ code: string }>)?.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                )) || <option value="SAR">SAR</option>}
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <ArrowRightLeft size={12} className="text-indigo-500" />
                <span className="text-[10px] font-bold">
                  سعر الصرف {exchangeOperator === 'divide' ? '(÷)' : '(×)'}
                </span>
              </div>
              <input
                type="number"
                step="0.00001"
                disabled={currency === 'SAR'}
                value={
                  currency === 'SAR'
                    ? 1
                    : exchangeRate
                      ? exchangeOperator === 'divide'
                        ? parseFloat((1 / exchangeRate).toFixed(5))
                        : exchangeRate
                      : 1
                }
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!val) return;
                  setMetadata('exchangeRate', exchangeOperator === 'divide' ? 1 / val : val);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Row 2: Treasury Account & Warehouse */}
          <div className="grid grid-cols-2 gap-2">
            {/* Custom High-Z Treasury Account Dropdown */}
            <div className="relative" ref={treasuryRef}>
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Wallet size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold">حساب الصندوق</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsTreasuryOpen(prev => !prev);
                }}
                className="flex w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
              >
                <span className="truncate">
                  {selectedAccount ? selectedAccount.name_ar : 'اختر الصندوق...'}
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    'shrink-0 text-slate-400 transition-transform duration-200',
                    isTreasuryOpen && 'rotate-180 text-blue-500'
                  )}
                />
              </button>

              {/* Popover Menu with high z-index */}
              {isTreasuryOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-850">
                  {paymentAccounts && paymentAccounts.length > 5 && (
                    <div className="relative mb-2">
                      <Search
                        size={13}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={treasurySearch}
                        onChange={e => {
                          setTreasurySearch(e.target.value);
                        }}
                        placeholder="بحث عن صندوق..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1 pl-2 pr-7 text-xs font-bold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        autoFocus
                      />
                    </div>
                  )}

                  <div className="custom-scrollbar max-h-56 space-y-1 overflow-y-auto">
                    {filteredAccounts.length === 0 ? (
                      <div className="p-3 text-center text-xs font-bold text-slate-400">
                        لا توجد صناديق متاحة
                      </div>
                    ) : (
                      filteredAccounts.map(account => {
                        const isSelected = account.id === cashboxId;
                        const isCash = Boolean(account.cashbox_id);
                        return (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              setMetadata('cashboxId', account.id);
                              setIsTreasuryOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-right transition-all',
                              isSelected
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                            )}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                                  isCash
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                                    : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                                )}
                              >
                                {isCash ? <Wallet size={14} /> : <Building2 size={14} />}
                              </div>
                              <div className="overflow-hidden">
                                <p className="truncate text-xs font-black">{account.name_ar}</p>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {isCash ? 'صندوق نقدي' : 'شركة صرافة'}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <span
                                className={cn(
                                  'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold',
                                  account.currency_code === 'SAR'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                )}
                              >
                                {account.currency_code}
                              </span>
                              {isSelected && <Check size={14} className="text-emerald-600" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Warehouse size={12} className="text-purple-500" />
                <span className="text-[10px] font-bold">المستودع</span>
              </div>
              <select
                value={warehouseId || ''}
                onChange={e => {
                  setMetadata('warehouseId', e.target.value);
                }}
                className="w-full truncate rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {warehouses?.map((w: Record<string, unknown>) => (
                  <option key={w.id as string} value={w.id as string}>
                    {(w.name_ar as string) || (w.name as string)}
                  </option>
                )) || <option value="wh_main">المستودع الرئيسي</option>}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceMeta;
