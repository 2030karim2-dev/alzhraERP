
export const ROUTES = {
  AUTH: {
    LANDING: '/welcome',
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    UPDATE_PASSWORD: '/update-password',
  },
  DASHBOARD: {
    ROOT: '/',
    INVENTORY: '/inventory',
    INVENTORY_AUDIT_SESSION: '/inventory/audit/:sessionId',
    INVENTORY_QUICK_AUDIT: '/inventory/quick-audit',
    ACCOUNTING: '/accounting',
    SALES: '/sales',
    PURCHASES: '/purchases',
    POS: '/pos',
    EXPENSES: '/expenses',
    SETTINGS: '/settings',
    APPEARANCE: '/settings/appearance',
    BONDS: '/bonds',
    SUPPLIERS: '/suppliers',
    CLIENTS: '/clients',
    PARTIES: '/parties',
    PARTIES_CUSTOMERS: '/parties/customers',
    PARTIES_SUPPLIERS: '/parties/suppliers',
    REPORTS: '/reports',
    VIN: '/vin',
    AI: '/ai',
    // Debts & Collection module (each main service = its own route)
    DEBTS: '/debts',
    DEBTS_FOLLOWUP: '/debts/followup',
    DEBTS_PROMISES: '/debts/promises',
    DEBTS_OUTBOX: '/debts/outbox',
    DEBTS_STATEMENTS: '/debts/statements',
    DEBTS_SETTINGS: '/debts/settings',
  },
} as const;

export type AppRoute = string;