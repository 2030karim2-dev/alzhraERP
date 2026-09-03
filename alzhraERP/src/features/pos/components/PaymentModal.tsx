import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSalesStore } from '../../sales/store';
import {
  useCashPaymentAccounts,
  useExchangePaymentAccounts,
  usePaymentAccounts,
} from '../../accounting/hooks/usePaymentAccounts';
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
  const [received, setReceived] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showItemEdit, setShowItemEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { items } = useSalesStore();
  const validItems = items.filter(i => i.productId);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setReceived('');
      setMethod(methods[0] ?? 'cash');
      setShowItemEdit(false);
      setSearchQuery('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, methods]);

  // Auto-select first exchange when switching to exchange tab
  const { data: cashAccountsData } = useCashPaymentAccounts();
  const { data: exchangeAccountsData } = useExchangePaymentAccounts();
  const { data: paymentAccountsData } = usePaymentAccounts();
  // تحويل آمن: النوع القادم من usePaymentAccounts (accounting) يختلف عن
  // النوع المحلي PaymentAccount رغم تطابق الحقول وظيفياً
  const accounts: PaymentAccount[] = paymentAccountsData || [];
  const cashList = useMemo(() => cashAccountsData ?? [], [cashAccountsData]);
  const exchangeList = useMemo(() => exchangeAccountsData ?? [], [exchangeAccountsData]);

  useEffect(() => {
    const targetList = method === 'exchange' ? exchangeList : cashList;
    setSelectedAccountId(prev =>
      targetList.some((a: { id: string }) => a.id === prev) ? prev : (targetList[0]?.id ?? null)
    );
  }, [method, cashList, exchangeList]);

  const receivedNum = parseFloat(received) || 0;
  const change = receivedNum - total;
  const canConfirm =
    !isProcessing &&
    (method === 'exchange' ? !!selectedAccountId : receivedNum >= total && !!selectedAccountId);
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleConfirm = useCallback((): void => {
    onConfirm({
      method,
      treasuryAccountId: selectedAccountId,
      received: receivedNum,
    });
  }, [onConfirm, method, selectedAccountId, receivedNum]);

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
          <TotalBanner total={total} currency={currency} />

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
          />

          {method === 'cash' && (
            <CashPaymentInput
              received={received}
              onReceivedChange={setReceived}
              total={total}
              currency={currency}
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
