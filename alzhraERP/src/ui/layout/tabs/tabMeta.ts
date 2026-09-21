/* eslint-disable complexity, max-lines-per-function */
/**
 * Workspace Tab Meta & Resolvers — تعريف مسميات وأيقونات التبويبات بحسب مسار الصفحة.
 *
 * @module ui/layout/tabs/tabMeta
 */

import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Package,
  Receipt,
  FileText,
  Users,
  Truck,
  Building2,
  Calculator,
  BarChart3,
  MessageSquare,
  Settings,
  Car,
  ReceiptText,
  Scale,
  Shield,
  Palette,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '../../../core/routes/paths';

export interface TabMetaInfo {
  title: string;
  iconKey: string;
  IconComponent: LucideIcon;
}

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Package,
  Receipt,
  FileText,
  Users,
  Truck,
  Building2,
  Calculator,
  BarChart3,
  MessageSquare,
  Settings,
  Car,
  ReceiptText,
  Scale,
  Shield,
  Palette,
  Layers,
};

/**
 * استخراج بيانات العنوان والأيقونة بحسب مسار الصفحة
 */
export function getTabMeta(pathname: string): TabMetaInfo {
  // تنظيف المسار وإزالة المعلمات
  const cleanPath = pathname.split('?')[0].split('#')[0];

  if (cleanPath === '/' || cleanPath === ROUTES.DASHBOARD.ROOT) {
    return { title: 'الرئيسية', iconKey: 'LayoutDashboard', IconComponent: LayoutDashboard };
  }

  if (cleanPath === ROUTES.DASHBOARD.POS) {
    return { title: 'نقطة البيع POS', iconKey: 'Store', IconComponent: Store };
  }

  if (cleanPath === ROUTES.DASHBOARD.SALES) {
    return { title: 'المبيعات والفواتير', iconKey: 'ShoppingBag', IconComponent: ShoppingBag };
  }

  if (cleanPath === ROUTES.DASHBOARD.BONDS) {
    return { title: 'السندات المالية', iconKey: 'FileText', IconComponent: FileText };
  }

  if (cleanPath.startsWith(ROUTES.DASHBOARD.DEBTS)) {
    return { title: 'الديون والتحصيل', iconKey: 'Scale', IconComponent: Scale };
  }

  if (cleanPath === ROUTES.DASHBOARD.CLIENTS || cleanPath === '/parties') {
    return { title: 'العملاء', iconKey: 'Users', IconComponent: Users };
  }

  if (cleanPath === ROUTES.DASHBOARD.SUPPLIERS) {
    return { title: 'الموردين', iconKey: 'Truck', IconComponent: Truck };
  }

  if (cleanPath === ROUTES.DASHBOARD.EMPLOYEES) {
    return { title: 'الموظفين', iconKey: 'Users', IconComponent: Users };
  }

  if (cleanPath.startsWith(ROUTES.DASHBOARD.INVENTORY)) {
    if (cleanPath.includes('audit')) {
      return { title: 'جرد المخزون', iconKey: 'Layers', IconComponent: Layers };
    }
    return { title: 'المخزون والأصناف', iconKey: 'Package', IconComponent: Package };
  }

  if (cleanPath === ROUTES.DASHBOARD.EXPENSES) {
    return { title: 'المصروفات', iconKey: 'ReceiptText', IconComponent: ReceiptText };
  }

  if (cleanPath === ROUTES.DASHBOARD.ACCOUNTING) {
    return { title: 'المحاسبة والقيود', iconKey: 'Calculator', IconComponent: Calculator };
  }

  if (cleanPath.startsWith(ROUTES.DASHBOARD.COMMISSIONS)) {
    return { title: 'العمولات', iconKey: 'Calculator', IconComponent: Calculator };
  }

  if (cleanPath === ROUTES.DASHBOARD.REPORTS) {
    return { title: 'التقارير المالية', iconKey: 'BarChart3', IconComponent: BarChart3 };
  }

  if (cleanPath === ROUTES.DASHBOARD.CHAT) {
    return { title: 'المحادثات والتواصل', iconKey: 'MessageSquare', IconComponent: MessageSquare };
  }

  if (cleanPath === ROUTES.DASHBOARD.APPEARANCE) {
    return { title: 'المظهر والسمات', iconKey: 'Palette', IconComponent: Palette };
  }

  if (cleanPath.startsWith(ROUTES.DASHBOARD.SETTINGS)) {
    return { title: 'الإعدادات', iconKey: 'Settings', IconComponent: Settings };
  }

  if (cleanPath === ROUTES.DASHBOARD.VIN) {
    return { title: 'فحص الشاسيه VIN', iconKey: 'Car', IconComponent: Car };
  }

  if (cleanPath === ROUTES.DASHBOARD.DAILY_RECONCILIATION) {
    return { title: 'المطابقة اليومية', iconKey: 'Scale', IconComponent: Scale };
  }

  if (cleanPath === ROUTES.DASHBOARD.SUPPLIER_PORTAL) {
    return { title: 'بوابة الموردين', iconKey: 'Building2', IconComponent: Building2 };
  }

  if (cleanPath.startsWith(ROUTES.ADMIN.ROOT)) {
    return { title: 'لوحة الإدارة', iconKey: 'Shield', IconComponent: Shield };
  }

  // عنوان افتراضي مشتق من المسار
  const parts = cleanPath.split('/').filter(Boolean);
  const fallbackTitle = parts.length > 0 ? parts[parts.length - 1] : 'شاشة';
  return { title: fallbackTitle, iconKey: 'Layers', IconComponent: Layers };
}

/**
 * قائمة الشاشات السريعة لزر الإضافة (+) في شريط التبويبات
 */
export const QUICK_LAUNCH_ITEMS = [
  { path: ROUTES.DASHBOARD.SALES, title: 'المبيعات والفواتير', iconKey: 'ShoppingBag' },
  { path: ROUTES.DASHBOARD.POS, title: 'نقطة البيع POS', iconKey: 'Store' },
  { path: ROUTES.DASHBOARD.BONDS, title: 'السندات المالية', iconKey: 'FileText' },
  { path: ROUTES.DASHBOARD.CLIENTS, title: 'العملاء', iconKey: 'Users' },
  { path: ROUTES.DASHBOARD.SUPPLIERS, title: 'الموردين', iconKey: 'Truck' },
  { path: ROUTES.DASHBOARD.EMPLOYEES, title: 'الموظفين', iconKey: 'Users' },
  { path: ROUTES.DASHBOARD.INVENTORY, title: 'المخزون والأصناف', iconKey: 'Package' },
  { path: ROUTES.DASHBOARD.ACCOUNTING, title: 'المحاسبة والقيود', iconKey: 'Calculator' },
  { path: ROUTES.DASHBOARD.EXPENSES, title: 'المصروفات', iconKey: 'ReceiptText' },
  { path: ROUTES.DASHBOARD.REPORTS, title: 'التقارير المالية', iconKey: 'BarChart3' },
  { path: ROUTES.DASHBOARD.CHAT, title: 'المحادثات والتواصل', iconKey: 'MessageSquare' },
];
