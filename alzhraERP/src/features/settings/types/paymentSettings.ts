// Payment Settings Types
export interface PaymentMethod {
    id: string;
    name_ar: string;
    name_en: string;
    type: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'wallet';
    is_active: boolean;
    icon: string;
}

export interface BankAccount {
    id: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    iban: string;
    is_default: boolean;
}

export interface PaymentSettings {
    // Methods
    available_payment_methods: PaymentMethod[];
    default_payment_method: 'cash' | 'card' | 'bank_transfer' | 'credit';

    // Bank accounts
    bank_accounts: BankAccount[];

    // Credit
    default_credit_days: number;
    max_credit_limit: number;
    require_approval_for_credit: boolean;

    // Early payment discount
    early_payment_discount_enabled: boolean;
    early_payment_discount_percent: number;
    early_payment_discount_days: number;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
    available_payment_methods: [
        { id: 'cash', name_ar: 'Cash', name_en: 'Cash', type: 'cash', is_active: true, icon: 'banknote' },
        { id: 'card', name_ar: 'Card / Mada', name_en: 'Card / Mada', type: 'card', is_active: true, icon: 'credit-card' },
        { id: 'bank_transfer', name_ar: 'Bank Transfer', name_en: 'Bank Transfer', type: 'bank_transfer', is_active: true, icon: 'building' },
        { id: 'credit', name_ar: 'Credit', name_en: 'Credit', type: 'credit', is_active: true, icon: 'clock' },
    ],
    default_payment_method: 'cash',
    bank_accounts: [],
    default_credit_days: 30,
    max_credit_limit: 10000,
    require_approval_for_credit: false,
    early_payment_discount_enabled: false,
    early_payment_discount_percent: 2,
    early_payment_discount_days: 10,
};
