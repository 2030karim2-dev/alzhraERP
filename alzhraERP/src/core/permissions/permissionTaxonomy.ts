// Permission catalog definitions (labels + categories). The `Permission` type
// is intentionally not imported here — permission keys are open strings.

export interface PermissionDefinition {
  key: string;
  label: string;
  description?: string;
  dangerous?: boolean;
}

export interface PermissionCategory {
  id: string;
  title: string;
  iconName: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'sales',
    title: 'المبيعات والفواتير',
    iconName: 'ShoppingCart',
    permissions: [
      { key: 'sales:read', label: 'عرض الفواتير وعروض الأسعار' },
      { key: 'sales:create', label: 'إنشاء فواتير مبيعات وعروض أسعار' },
      { key: 'sales:update', label: 'تعديل فواتير المبيعات' },
      { key: 'sales:delete', label: 'حذف أو إلغاء فواتير المبيعات', dangerous: true },
    ],
  },
  {
    id: 'purchases',
    title: 'المشتريات والموردين',
    iconName: 'Truck',
    permissions: [
      { key: 'purchases:read', label: 'عرض فواتير المشتريات' },
      { key: 'purchases:create', label: 'إصدار فواتير شراء وأوامر توريد' },
      { key: 'purchases:update', label: 'تعديل فواتير الشراء' },
      { key: 'purchases:delete', label: 'حذف فواتير الشراء', dangerous: true },
    ],
  },
  {
    id: 'inventory',
    title: 'المخزون والمنتجات',
    iconName: 'Package',
    permissions: [
      { key: 'inventory:read', label: 'عرض المنتجات والأرصدة المخزنية' },
      { key: 'inventory:create', label: 'إضافة منتجات وأصناف جديدة' },
      { key: 'inventory:update', label: 'تعديل بيانات المنتجات والأسعار' },
      { key: 'inventory:delete', label: 'حذف أصناف من المخزون', dangerous: true },
    ],
  },
  {
    id: 'customers',
    title: 'العملاء والجهات',
    iconName: 'Users',
    permissions: [
      { key: 'customers:read', label: 'عرض قائمة العملاء والجهات' },
      { key: 'customers:create', label: 'إضافة عملاء جدد' },
      { key: 'customers:update', label: 'تعديل بيانات العملاء' },
      { key: 'customers:delete', label: 'حذف عملاء', dangerous: true },
    ],
  },
  {
    id: 'debts',
    title: 'الديون والتحصيل',
    iconName: 'Handshake',
    permissions: [
      { key: 'debts:read', label: 'عرض أرصدة الديون والوعود وكشوف الحساب' },
      { key: 'debts:manage', label: 'إدارة وتوثيق الوعود وتسجيل السداد' },
      { key: 'debts:remind', label: 'إرسال رسائل التذكير والمطالبات عبر واتساب' },
    ],
  },
  {
    id: 'accounting',
    title: 'المحاسبة والقيود المالية',
    iconName: 'Calculator',
    permissions: [
      { key: 'accounting:read', label: 'عرض دليل الحسابات ودفتر الأستاذ' },
      { key: 'accounting:create', label: 'إنشاء وترحيل قيود اليومية' },
      { key: 'accounting:update', label: 'تعديل القيود المالية غير المرحلة' },
      { key: 'accounting:delete', label: 'حذف وإلغاء القيود المحاسبية', dangerous: true },
    ],
  },
  {
    id: 'expenses',
    title: 'المصروفات والسندات',
    iconName: 'Receipt',
    permissions: [
      { key: 'expenses:read', label: 'عرض سندات الصرف والمصروفات' },
      { key: 'expenses:create', label: 'تسجيل سندات صرف ومصروفات جديدة' },
      { key: 'expenses:update', label: 'تعديل سندات المصروفات' },
      { key: 'expenses:delete', label: 'حذف سندات المصروفات', dangerous: true },
    ],
  },
  {
    id: 'reports',
    title: 'التقارير والإحصائيات',
    iconName: 'BarChart3',
    permissions: [
      { key: 'reports:read', label: 'الاطلاع على التقارير المالية والتشغيلية' },
      { key: 'reports:export', label: 'تصدير التقارير (Excel / PDF)' },
    ],
  },
  {
    id: 'system',
    title: 'النظام والإدارة العامة',
    iconName: 'Settings',
    permissions: [
      { key: 'admin:access', label: 'الوصول للوحة التحكم الإدارية' },
      { key: 'settings:manage', label: 'تعديل إعدادات المنشأة والفروع' },
      { key: 'ai:use', label: 'استخدام أدوات الذكاء الاصطناعي والمساعد الذكي' },
    ],
  },
];
