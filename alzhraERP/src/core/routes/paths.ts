
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
    AI: '/ai',
    VEHICLE_COMPATIBILITY: '/vehicle-compatibility',
  },
} as const;

export type AppRoute = string;