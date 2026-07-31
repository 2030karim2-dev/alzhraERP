// ============================================
// Unified Settings Store
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Import types and defaults from extracted files
import {
    InvoiceSettings,
    InventorySettings,
    PaymentSettings,
    POSSettings,
    PrintSettings,
    IntegrationSettings,
    LocalizationSettings,
    BankAccount,
    DEFAULT_INVOICE_SETTINGS,
    DEFAULT_INVENTORY_SETTINGS,
    DEFAULT_PAYMENT_SETTINGS,
    DEFAULT_POS_SETTINGS,
    DEFAULT_PRINT_SETTINGS,
    DEFAULT_INTEGRATION_SETTINGS,
    DEFAULT_LOCALIZATION_SETTINGS,
} from './types/index';

// ------------------------------------------
// Store State Interface
// ------------------------------------------
interface SettingsState {
    // Settings data
    invoice: InvoiceSettings;
    inventory: InventorySettings;
    payment: PaymentSettings;
    pos: POSSettings;
    print: PrintSettings;
    integration: IntegrationSettings;
    localization: LocalizationSettings;

    // Actions
    setInvoiceSettings: (settings: Partial<InvoiceSettings>) => void;
    setInventorySettings: (settings: Partial<InventorySettings>) => void;
    setPaymentSettings: (settings: Partial<PaymentSettings>) => void;
    setPOSSettings: (settings: Partial<POSSettings>) => void;
    setPrintSettings: (settings: Partial<PrintSettings>) => void;
    setIntegrationSettings: (settings: Partial<IntegrationSettings>) => void;
    setLocalizationSettings: (settings: Partial<LocalizationSettings>) => void;

    // Bank accounts
    addBankAccount: (account: BankAccount) => void;
    updateBankAccount: (id: string, account: Partial<BankAccount>) => void;
    deleteBankAccount: (id: string) => void;
    setDefaultBankAccount: (id: string) => void;

    // Payment methods
    togglePaymentMethod: (id: string) => void;

    // Reset
    resetAllSettings: () => void;
    resetSection: (section: keyof Omit<SettingsState, keyof SettingsActions>) => void;
}

// Type for actions only
type SettingsActions = {
    setInvoiceSettings: (settings: Partial<InvoiceSettings>) => void;
    setInventorySettings: (settings: Partial<InventorySettings>) => void;
    setPaymentSettings: (settings: Partial<PaymentSettings>) => void;
    setPOSSettings: (settings: Partial<POSSettings>) => void;
    setPrintSettings: (settings: Partial<PrintSettings>) => void;
    setIntegrationSettings: (settings: Partial<IntegrationSettings>) => void;
    setLocalizationSettings: (settings: Partial<LocalizationSettings>) => void;
    addBankAccount: (account: BankAccount) => void;
    updateBankAccount: (id: string, account: Partial<BankAccount>) => void;
    deleteBankAccount: (id: string) => void;
    setDefaultBankAccount: (id: string) => void;
    togglePaymentMethod: (id: string) => void;
    resetAllSettings: () => void;
    resetSection: (section: string) => void;
};

// ------------------------------------------
// Store Implementation
// ------------------------------------------
export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // Initial state - using imported defaults
            invoice: DEFAULT_INVOICE_SETTINGS,
            inventory: DEFAULT_INVENTORY_SETTINGS,
            payment: DEFAULT_PAYMENT_SETTINGS,
            pos: DEFAULT_POS_SETTINGS,
            print: DEFAULT_PRINT_SETTINGS,
            integration: DEFAULT_INTEGRATION_SETTINGS,
            localization: DEFAULT_LOCALIZATION_SETTINGS,

            // Invoice settings
            setInvoiceSettings: (settings) => set((state) => ({
                invoice: { ...state.invoice, ...settings }
            })),

            // Inventory settings
            setInventorySettings: (settings) => set((state) => ({
                inventory: { ...state.inventory, ...settings }
            })),

            // Payment settings
            setPaymentSettings: (settings) => set((state) => ({
                payment: { ...state.payment, ...settings }
            })),

            // POS settings
            setPOSSettings: (settings) => set((state) => ({
                pos: { ...state.pos, ...settings }
            })),

            // Print settings
            setPrintSettings: (settings) => set((state) => ({
                print: { ...state.print, ...settings }
            })),

            // Integration settings
            setIntegrationSettings: (settings) => set((state) => ({
                integration: { ...state.integration, ...settings }
            })),

            // Localization settings
            setLocalizationSettings: (settings) => set((state) => ({
                localization: { ...state.localization, ...settings }
            })),

            // Bank accounts management
            addBankAccount: (account) => set((state) => ({
                payment: {
                    ...state.payment,
                    bank_accounts: [...state.payment.bank_accounts, account]
                }
            })),

            updateBankAccount: (id, account) => set((state) => ({
                payment: {
                    ...state.payment,
                    bank_accounts: state.payment.bank_accounts.map((ba) =>
                        ba.id === id ? { ...ba, ...account } : ba
                    )
                }
            })),

            deleteBankAccount: (id) => set((state) => ({
                payment: {
                    ...state.payment,
                    bank_accounts: state.payment.bank_accounts.filter((ba) => ba.id !== id)
                }
            })),

            setDefaultBankAccount: (id) => set((state) => ({
                payment: {
                    ...state.payment,
                    bank_accounts: state.payment.bank_accounts.map((ba) => ({
                        ...ba,
                        is_default: ba.id === id
                    }))
                }
            })),

            // Payment methods
            togglePaymentMethod: (id) => set((state) => ({
                payment: {
                    ...state.payment,
                    available_payment_methods: state.payment.available_payment_methods.map((pm) =>
                        pm.id === id ? { ...pm, is_active: !pm.is_active } : pm
                    )
                }
            })),

            // Reset all settings
            resetAllSettings: () => set({
                invoice: DEFAULT_INVOICE_SETTINGS,
                inventory: DEFAULT_INVENTORY_SETTINGS,
                payment: DEFAULT_PAYMENT_SETTINGS,
                pos: DEFAULT_POS_SETTINGS,
                print: DEFAULT_PRINT_SETTINGS,
                integration: DEFAULT_INTEGRATION_SETTINGS,
                localization: DEFAULT_LOCALIZATION_SETTINGS,
            }),

            // Reset specific section
            resetSection: (section) => {
                const defaults: Record<string, any> = {
                    invoice: DEFAULT_INVOICE_SETTINGS,
                    inventory: DEFAULT_INVENTORY_SETTINGS,
                    payment: DEFAULT_PAYMENT_SETTINGS,
                    pos: DEFAULT_POS_SETTINGS,
                    print: DEFAULT_PRINT_SETTINGS,
                    integration: DEFAULT_INTEGRATION_SETTINGS,
                    localization: DEFAULT_LOCALIZATION_SETTINGS,
                };
                set({ [section]: defaults[section] });
            },
        }),
        {
            name: 'alzhra-settings',
            partialize: (state) => ({
                invoice: state.invoice,
                inventory: state.inventory,
                payment: state.payment,
                pos: state.pos,
                print: state.print,
                integration: state.integration,
                localization: state.localization,
            }),
        }
    )
);

// ------------------------------------------
// Selector Hooks
// ------------------------------------------
export const useInvoiceSettings = () => useSettingsStore((state) => state.invoice);
export const useInventorySettings = () => useSettingsStore((state) => state.inventory);
export const usePaymentSettings = () => useSettingsStore((state) => state.payment);
export const usePOSSettings = () => useSettingsStore((state) => state.pos);
export const usePrintSettings = () => useSettingsStore((state) => state.print);
export const useIntegrationSettings = () => useSettingsStore((state) => state.integration);
export const useLocalizationSettings = () => useSettingsStore((state) => state.localization);

// Re-export types for convenience
export type {
    InvoiceSettings,
    InventorySettings,
    PaymentSettings,
    POSSettings,
    PrintSettings,
    IntegrationSettings,
    LocalizationSettings,
    BankAccount,
    PaymentMethod,
} from './types/index';
