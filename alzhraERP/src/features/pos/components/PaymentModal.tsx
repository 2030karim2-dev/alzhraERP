import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { useSalesStore } from '../../sales/store';
import { usePaymentAccounts } from '../../accounting/hooks/usePaymentAccounts';
import { cn } from '../../../core/utils';
import type { POSPaymentResult, POSPaymentMethod } from './payment';

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
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen, onClose, total, currency, onConfirm, isProcessing
}) => {
    const [method, setMethod] = useState<POSPaymentMethod>('cash');
    const [received, setReceived] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [showItemEdit, setShowItemEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { items, updateItem } = useSalesStore();
    const validItems = items.filter(i => i.productId);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setReceived('');
            setMethod('cash');
            setShowItemEdit(false);
            setSearchQuery('');
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [isOpen]);

    // Auto-select first exchange when switching to exchange tab
    const { data: paymentAccounts } = usePaymentAccounts();
    const accounts = (paymentAccounts || []) as any;
    const cashAccounts = useMemo(() => accounts.filter((a: any) =>
        (a.code ?? '').startsWith('101') ||
        (a.name_ar ?? '').includes('صندوق') ||
        (a.name_ar ?? '').includes('كاش')
    ), [accounts]);
    const exchangeAccounts = useMemo(() => accounts.filter((a: any) =>
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
    ), [accounts]);

    useEffect(() => {
        if (method === 'exchange') {
            setSelectedAccountId(prev => exchangeAccounts.find((a: any) => a.id === prev) ? prev : (exchangeAccounts[0]?.id ?? null));
        } else {
            setSelectedAccountId(prev => cashAccounts.find((a: any) => a.id === prev) ? prev : (cashAccounts[0]?.id ?? null));
        }
    }, [method, cashAccounts.length, exchangeAccounts.length]);

    const receivedNum = parseFloat(received) || 0;
    const change = receivedNum - total;
    const canConfirm = !isProcessing && (
        method === 'exchange'
            ? !!selectedAccountId
            : receivedNum >= total && !!selectedAccountId
    );
    const selectedAccount = accounts.find((a: any) => a.id === selectedAccountId);

    // Keyboard shortcuts — all hooks must be declared before any early return
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && canConfirm && !isProcessing) handleConfirm();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, canConfirm, isProcessing]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm({
            method,
            treasuryAccountId: selectedAccountId,
            received: receivedNum,
        });
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 font-cairo"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95dvh]">
                <PaymentHeader
                    itemCount={validItems.length}
                    total={total}
                    currency={currency}
                    validItems={validItems}
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                    <TotalBanner total={total} currency={currency} />

                    <ItemPriceEditor
                        show={showItemEdit}
                        onToggle={() => setShowItemEdit(v => !v)}
                        items={validItems}
                        allItems={items}
                        currency={currency}
                    />

                    <PaymentMethodSelector
                        method={method}
                        onMethodChange={setMethod}
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