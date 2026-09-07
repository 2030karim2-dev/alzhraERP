import {
  Building2,
  BarChart3,
  CreditCard,
  Users,
  Activity,
  ShieldAlert,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { AdminTab } from '../../types';

/**
 * التعريف الموحّد لتبويبات مركز التحكم — المصدر الوحيد لتسمية/أيقونة كل تبويب.
 * يُستهلك من AdminTabs (شريط التبويبات) وAdminHubPage (توجيه التبويب) معاً
 * حتى لا تتكرر القائمة في أماكن متعددة مع احتمال انحرافها.
 */
export interface AdminTabDefinition {
  id: AdminTab;
  /** المسار الكامل الذي يُستضاف فيه التبويب في الـ URL (نظرة عامة = '') */
  pathSuffix: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_TAB_ITEM: Record<AdminTab, AdminTabDefinition> = {
  overview: {
    id: 'overview',
    pathSuffix: '',
    label: 'نظرة عامة',
    icon: BarChart3,
  },
  companies: {
    id: 'companies',
    pathSuffix: '/companies',
    label: 'المنشآت والشركات',
    icon: Building2,
  },
  subscriptions: {
    id: 'subscriptions',
    pathSuffix: '/subscriptions',
    label: 'باقات الاشتراك',
    icon: CreditCard,
  },
  users: {
    id: 'users',
    pathSuffix: '/users',
    label: 'دليل المستخدمين',
    icon: Users,
  },
  telemetry: {
    id: 'telemetry',
    pathSuffix: '/telemetry',
    label: 'مراقبة الخدمات والـ AI',
    icon: Activity,
  },
  security: {
    id: 'security',
    pathSuffix: '/security',
    label: 'الأمان والتنبيهات',
    icon: ShieldAlert,
  },
  settings: {
    id: 'settings',
    pathSuffix: '/settings',
    label: 'إعدادات المنصة والصيانة',
    icon: Settings,
  },
};

/** كل المعرّفات الصالحة لتبويب — تُستخدم للتحقق من قيمة `:tab` في الـ URL. */
export const VALID_ADMIN_TABS: ReadonlySet<string> = new Set(
  Object.keys(ADMIN_TAB_ITEM) as AdminTab[]
);

/**
 * حلّ قيمة تبويب من المسار الفرعي `:tab` في الـ URL.
 * أي قيمة غير معروفة أو فارغة تتحول إلى 'overview' (المسار الجذر الآمن) كي لا
 * يستقر المستخدم على تبويب غير موجود عند مشاركة رابط خاطئ.
 */
export const resolveAdminTab = (raw: string | undefined): AdminTab =>
  raw !== undefined && raw !== '' && VALID_ADMIN_TABS.has(raw) ? (raw as AdminTab) : 'overview';
