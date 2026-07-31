import { create } from 'zustand';

const STORAGE_KEY = 'alz_discount_settings';

export interface DiscountSettings {
    /** هل الخصم مفعل في الفواتير؟ */
    discountEnabled: boolean;
    /** هل الضريبة مفعلة؟ */
    taxEnabled: boolean;
    /** نسبة الضريبة الافتراضية (مثلا 15) */
    defaultTaxRate: number;
    /** نوع الضريبة الافتراضي (standard, zero, exempt) */
    defaultTaxType: 'standard' | 'zero' | 'exempt';
}

interface DiscountState extends DiscountSettings {
    setDiscountEnabled: (enabled: boolean) => void;
    setTaxEnabled: (enabled: boolean) => void;
    setDefaultTaxRate: (rate: number) => void;
    setDefaultTaxType: (type: 'standard' | 'zero' | 'exempt') => void;
}

const loadSettings = (): DiscountSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return { 
        discountEnabled: false,
        taxEnabled: true,
        defaultTaxRate: 15,
        defaultTaxType: 'standard'
    };
};

const saveSettings = (settings: DiscountSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const useDiscountStore = create<DiscountState>((set, get) => ({
    ...loadSettings(),

    setDiscountEnabled: (enabled) => {
        set({ discountEnabled: enabled });
        saveSettings(get());
    },
    setTaxEnabled: (enabled) => {
        set({ taxEnabled: enabled });
        saveSettings(get());
    },
    setDefaultTaxRate: (rate) => {
        set({ defaultTaxRate: rate });
        saveSettings(get());
    },
    setDefaultTaxType: (type) => {
        set({ defaultTaxType: type });
        saveSettings(get());
    }
}));
