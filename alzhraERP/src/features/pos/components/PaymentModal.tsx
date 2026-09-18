import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSalesStore } from '../../sales/store';
import {
  useCashPaymentAccounts,
  useExchangePaymentAccounts,
  usePaymentAccounts,
} from '../../accounting/hooks/usePaymentAccounts';
import { useCurrencies } from '../../settings/hooks';
import { resolveAutoExchangeRate } from '../../../core/utils/currencyUtils';
import { cn } from '../../../core/utils';
import type { POSPaymentResult, POSPaymentMethod, PaymentAccount } from './payment';

// Re-export types for backward compatibility
export type { POSPaymentMethod, POSPaymentResult, PaymentAccount } from './payment/paymentTypes';

import {
  PaymentHeader,
  TotalBanner,
  ItemPriceEditor,
  PaymentMethodSelector,
  TreasuryAccountPicker,
  CashPaymentInput,
  PaymentSummary,
  PaymentModalFooter,
} from './payment';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  currency: string;
  onConfirm: (result: POSPaymentResult) => void;
  isProcessing: boolean;
  /** [FIX] طرق الدفع المعروضة — تتيح تقييد النافذة على النقد فقط في مسارات
   * البيع التي لا يدعمها خط الأنابيب بعد (مثل الصرافة). الافتراضي: الكل. */
  allowedMethods?: POSPaymentMethod[];
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  currency,
  onConfirm,
  isProcessing,
  allowedMethods,
}) => {
  const methods = useMemo<POSPaymentMethod[]>(
    () => allowedMethods ?? ['cash', 'exchange'],
    [allowedMethods]
  );
  const [method, setMethod] = useState<POSPaymentMethod>(methods[0] ?? 'cash');
  const [paymentCurrency, setPaymentCurrency] = useState<string>(currency || 'SAR');
  const [received, setReceived] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showItemEdit, setShowItemEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { items, exchangeRate: storeExchangeRate } = useSalesStore();
  const validItems = items.filter(i => i.productId);

  const { currencies, rates } = useCurrencies();
  const defaultYerRate = useMemo(() => {
    return (
      resolveAutoExchangeRate(
        'YER',
        rates.data,
        currencies.data as Array<{ code: string; exchange_operator?: 'multiply' | 'divide' }>
      ) || 410
    );
  }, [rates.data, currencies.data]);

  const [customRate, setCustomRate] = useState<number>(
    storeExchangeRate && storeExchangeRate > 1 ? storeExchangeRate : defaultYerRate
  );

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setReceived('');
      setPaymentCurrency(currency || 'SAR');
      setMethod(methods[0] ?? 'cash');
      setShowItemEdit(false);
      setSearchQuery('');
      setCustomRate(
        storeExchangeRate && storeExchangeRate > 1 ? storeExchangeRate : defaultYerRate
      );
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, methods, currency, storeExchangeRate, defaultYerRate]);

  // Accounts
  const { data: cashAccountsData } = useCashPaymentAccounts();
  const { data: exchangeAccountsData } = useExchangePaymentAccounts();
  const { data: paymentAccountsData } = usePaymentAccounts();
  const accounts: PaymentAccount[] = paymentAccountsData || [];
  const cashList = useMemo(() => cashAccountsData ?? [], [cashAccountsData]);
  const exchangeList = useMemo(() => exchangeAccountsData ?? [], [exchangeAccountsData]);

  // Auto-select cashbox matching payment currency or first exchange
  useEffect(() => {
    if (method === 'exchange') {
      setSelectedAccountId(prev =>
        exchangeList.some((a: { id: string }) => a.id === prev)
          ? prev
          : (exchangeList[0]?.id ?? null)
      );
    } else {
      const norm = (paymentCurrency || 'SAR').toUpperCase().trim();
      const matchingAccount = cashList.find(
        (a: any) =>
          (a.currency_code ?? '').toUpperCase() === norm ||
          (norm === 'YER' && (a.name_ar ?? '').includes('يمني')) ||
          (norm === 'SAR' && (a.name_ar ?? '').includes('سعودي'))
      );
      setSelectedAccountId(matchingAccount?.id ?? cashList[0]?.id ?? null);
    }
  }, [method, paymentCurrency, cashList, exchangeList]);

  // Compute payable total converted to payment currency
  const payableTotal = useMemo(() => {
    if (paymentCurrency === currency) return total;
    const rate = customRate > 0 ? customRate : defaultYerRate;
    if (currency === 'SAR' && paymentCurrency === 'YER') {
      return Math.round(total * rate);
    }
    if (currency === 'YER' && paymentCurrency === 'SAR') {
      return Number((total / rate).toFixed(2));
    }
    return total;
  }, [total, currency, paymentCurrency, customRate, defaultYerRate]);

  const receivedNum = parseFloat(received) || 0;
  const change = receivedNum - payableTotal;
  const canConfirm =
    !isProcessing &&
    (method === 'exchange'
      ? !!selectedAccountId
      : receivedNum >= payableTotal && !!selectedAccountId);
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleConfirm = useCallback((): void => {
    onConfirm({
      method,
      treasuryAccountId: selectedAccountId,
      received: receivedNum,
      paymentCurrency,
      exchangeRate: paymentCurrency === 'YER' || currency === 'YER' ? customRate : 1,
    });
  }, [onConfirm, method, selectedAccountId, receivedNum, paymentCurrency, currency, customRate]);

  // Keyboard shortcuts — all hooks must be declared before any early return
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && canConfirm && !isProcessing) handleConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, canConfirm, isProcessing, onClose, handleConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="font-cairo fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-in zoom-in-95 flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[var(--app-surface)] shadow-2xl duration-200 dark:border-slate-800">
        <PaymentHeader
          itemCount={validItems.length}
          total={total}
          currency={currency}
          validItems={validItems}
          onClose={onClose}
        />

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <TotalBanner
            total={payableTotal}
            currency={paymentCurrency}
            originalTotal={total}
            originalCurrency={currency}
            exchangeRate={customRate}
          />

          {/* شريط اختيار عملة الدفع وضبط سعر الصرف */}
          <div className="mx-4 mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                عملة تسليم المبلغ
              </span>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentCurrency('SAR');
                    setReceived('');
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-bold transition-all',
                    paymentCurrency === 'SAR'
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  )}
                >
                  🇸🇦 ريال سعودي
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentCurrency('YER');
                    setReceived('');
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-bold transition-all',
                    paymentCurrency === 'YER'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  )}
                >
                  🇾🇪 ريال يمني
                </button>
              </div>
            </div>

            {/* تعديل سعر الصرف اللحظي عند التعامل بالريال اليمني */}
            {(paymentCurrency === 'YER' || currency === 'YER') && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[11px] dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span>سعر الصرف:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">1 ر.س =</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={customRate}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) setCustomRate(val);
                    }}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-center font-mono text-xs font-bold text-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400"
                  />
                  <span className="text-[10px] font-bold text-slate-500">ر.ي</span>
                  {customRate !== defaultYerRate && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomRate(defaultYerRate);
                      }}
                      className="text-[10px] text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                    >
                      افتراضي ({defaultYerRate})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <ItemPriceEditor
            show={showItemEdit}
            onToggle={() => {
              setShowItemEdit(v => !v);
            }}
            items={validItems}
            allItems={items}
            currency={currency}
          />

          <PaymentMethodSelector
            method={method}
            onMethodChange={setMethod}
            allowedMethods={methods}
          />

          <TreasuryAccountPicker
            method={method}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchInputRef={searchInputRef}
            paymentCurrency={paymentCurrency}
          />

          {method === 'cash' && (
            <CashPaymentInput
              received={received}
              onReceivedChange={setReceived}
              total={payableTotal}
              currency={paymentCurrency}
              exchangeRate={customRate}
              inputRef={inputRef}
            />
          )}

          <PaymentSummary
            total={total}
            currency={currency}
            method={method}
            selectedAccount={selectedAccount}
            receivedNum={receivedNum}
            change={change}
            paymentCurrency={paymentCurrency}
            payableTotal={payableTotal}
            exchangeRate={paymentCurrency === 'YER' || currency === 'YER' ? customRate : 1}
          />

          <div className="h-2" />
        </div>

        <PaymentModalFooter
          isProcessing={isProcessing}
          canConfirm={canConfirm}
          method={method}
          onClose={onClose}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
};

export default PaymentModal;
