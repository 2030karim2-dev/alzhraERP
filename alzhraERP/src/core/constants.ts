
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
  Brain,
  Car
} from 'lucide-react';
import { MenuItem } from './types';
import { ROUTES } from './routes/paths';

export const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', labelKey: 'overview', icon: LayoutDashboard, path: ROUTES.DASHBOARD.ROOT, color: 'purple' },
  { id: 'sales', labelKey: 'invoices', icon: ShoppingBag, path: ROUTES.DASHBOARD.SALES, color: 'green' },
  { id: 'bonds', labelKey: 'receipts', icon: FileText, path: ROUTES.DASHBOARD.BONDS, color: 'yellow' },
  { id: 'clients', labelKey: 'customers', icon: Users, path: ROUTES.DASHBOARD.CLIENTS, color: 'emerald' },
  { id: 'suppliers', labelKey: 'suppliers', icon: Users, path: ROUTES.DASHBOARD.SUPPLIERS, color: 'blue' },
  { id: 'inventory', labelKey: 'products', icon: Wrench, path: ROUTES.DASHBOARD.INVENTORY, color: 'orange' },
  { id: 'vehicle-compatibility', labelKey: 'vehicle_compatibility_search', icon: Car, path: ROUTES.DASHBOARD.VEHICLE_COMPATIBILITY, color: 'indigo' },
  { id: 'expenses', labelKey: 'expenses', icon: Receipt, path: ROUTES.DASHBOARD.EXPENSES, color: 'red' },
  { id: 'accounting', labelKey: 'accounting', icon: Calculator, path: ROUTES.DASHBOARD.ACCOUNTING, color: 'indigo' },
  { id: 'pos', labelKey: 'pos', icon: Package, path: ROUTES.DASHBOARD.POS, color: 'pink' },

  { id: 'purchases', labelKey: 'purchases', icon: ShoppingCart, path: ROUTES.DASHBOARD.PURCHASES, color: 'teal' },
  { id: 'reports', labelKey: 'reports', icon: BarChart3, path: ROUTES.DASHBOARD.REPORTS, color: 'slate' },
  { id: 'ai-brain', labelKey: 'ai_brain', icon: Brain, path: '/ai-brain', color: 'purple' },
  { id: 'settings', labelKey: 'settings', icon: Settings, path: ROUTES.DASHBOARD.SETTINGS, isOwner: true, color: 'slate' },
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
} as const;
