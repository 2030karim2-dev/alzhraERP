
import {
  LayoutDashboard,
  Calculator,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  FileText,
  Wrench,
  Users,
  BarChart3,
  Settings,
  Package,
  Car,
  HandCoins
} from 'lucide-react';
import { MenuItem } from './types';
import { ROUTES } from './routes/paths';

export const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', labelKey: 'overview', icon: LayoutDashboard, path: ROUTES.DASHBOARD.ROOT, color: 'purple' },
  { id: 'sales', labelKey: 'invoices', icon: ShoppingBag, path: ROUTES.DASHBOARD.SALES, color: 'green' },
  { id: 'bonds', labelKey: 'receipts', icon: FileText, path: ROUTES.DASHBOARD.BONDS, color: 'yellow' },
  { id: 'debts', labelKey: 'debts', icon: HandCoins, path: ROUTES.DASHBOARD.DEBTS, color: 'red' },
  { id: 'clients', labelKey: 'customers', icon: Users, path: ROUTES.DASHBOARD.CLIENTS, color: 'emerald' },
  { id: 'suppliers', labelKey: 'suppliers', icon: Users, path: ROUTES.DASHBOARD.SUPPLIERS, color: 'blue' },
  { id: 'inventory', labelKey: 'products', icon: Wrench, path: ROUTES.DASHBOARD.INVENTORY, color: 'orange' },
  { id: 'expenses', labelKey: 'expenses', icon: Receipt, path: ROUTES.DASHBOARD.EXPENSES, color: 'red' },
  { id: 'accounting', labelKey: 'accounting', icon: Calculator, path: ROUTES.DASHBOARD.ACCOUNTING, color: 'indigo' },
  { id: 'commissions', labelKey: 'commission_dashboard', icon: Calculator, path: ROUTES.DASHBOARD.COMMISSIONS, color: 'teal' },
  { id: 'pos', labelKey: 'pos', icon: Package, path: ROUTES.DASHBOARD.POS, color: 'pink' },
  { id: 'vin', labelKey: 'vin_intelligence', icon: Car, path: ROUTES.DASHBOARD.VIN, color: 'blue' },

  { id: 'purchases', labelKey: 'purchases', icon: ShoppingCart, path: ROUTES.DASHBOARD.PURCHASES, color: 'teal' },
  { id: 'reports', labelKey: 'reports', icon: BarChart3, path: ROUTES.DASHBOARD.REPORTS, color: 'slate' },
  { id: 'settings', labelKey: 'settings', icon: Settings, path: ROUTES.DASHBOARD.SETTINGS, requiredPermission: 'settings:manage', color: 'slate' },
];

export const APP_NAME = 'Alzhra Smart';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'نظام متكامل لإدارة الأعمال';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  COMPANY_DATA: 'company_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  LAST_INVOICE_NUMBER: 'last_invoice_number',
  AUTO_BACKUP: 'alz_auto_backup',
  BACKUP_LOGS: 'alz_backup_logs',
  INVOICE_COL_WIDTHS: 'invoice_col_widths',
  AI_MODEL: 'ai_model',
  COLUMN_RESIZE: 'persist-cols',
} as const;
