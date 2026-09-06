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
    LEGACY: {
      // Old party routes — kept ONLY as redirect targets to /clients & /suppliers
      // (see plans/party-routes-tabs-cleanup.md). Do not link to these.
      PARTIES: '/parties',
      PARTIES_CUSTOMERS: '/parties/customers',
      PARTIES_SUPPLIERS: '/parties/suppliers',
    },
    REPORTS: '/reports',
    COMMISSIONS: '/commissions',
    COMMISSIONS_CONFIG: '/commissions/configuration',
    COMMISSIONS_ASSIGNMENTS: '/commissions/assignments',
    COMMISSIONS_PERIODS: '/commissions/periods',
    COMMISSIONS_REPORTS: '/commissions/reports',
    VIN: '/vin',
    // Debts & Collection module (each main service = its own route)
    DEBTS: '/debts',
    DEBTS_FOLLOWUP: '/debts/followup',
    DEBTS_PROMISES: '/debts/promises',
    DEBTS_OUTBOX: '/debts/outbox',
    DEBTS_STATEMENTS: '/debts/statements',
    DEBTS_SETTINGS: '/debts/settings',
    SUPPLIER_PORTAL: '/supplier-portal',
    CHAT: '/chat',
    DAILY_RECONCILIATION: '/daily-reconciliation',
  },
  ADMIN: {
    ROOT: '/admin',
  },
  PUBLIC: {
    SUPPLIER_PORTAL: '/portal/supplier/:token',
  },
} as const;

export type AppRoute = string;
