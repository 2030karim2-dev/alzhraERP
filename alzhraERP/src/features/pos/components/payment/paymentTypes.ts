import type { Account as AccountModel } from '../../../accounting/types/models';

// Local Account type that matches what usePaymentAccounts returns
export interface PaymentAccount {
    id: string;
    company_id: string;
    code: string;
    name_ar: string;
    type: string;
    balance: number;
    currency_code: string;
    is_system: boolean;
    parent_id?: string | null;
    name?: string;
    is_active?: boolean;
    created_at?: string;
}

export type POSPaymentMethod = 'cash' | 'exchange';

export interface POSPaymentResult {
    method: POSPaymentMethod;
    treasuryAccountId: string | null;
    received: number;
}

export interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    currency: string;
    onConfirm: (result: POSPaymentResult) => void;
    isProcessing: boolean;
}