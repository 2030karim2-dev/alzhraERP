// Local Account type that matches what usePaymentAccounts returns.
// Extends the canonical `PaymentAccount` (accounting) so consumers keep
// backward-compatible extra fields, while the *required* core shape stays
// aligned with the data source — removing the need for unsafe `as unknown as`
// casts at call sites.
import type { PaymentAccount as CanonicalPaymentAccount } from '../../../accounting/hooks/usePaymentAccounts';

export interface PaymentAccount extends CanonicalPaymentAccount {
    company_id?: string;
    type?: string;
    is_system?: boolean;
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