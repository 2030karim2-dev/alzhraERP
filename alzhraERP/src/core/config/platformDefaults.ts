/**
 * مصدر الحقيقة الواحد (Single Source of Truth) للقيم الافتراضية لإعدادات
 * المنصة (وضع الصيانة + مفاتيح الميزات).
 *
 * سبب الوجود هنا (core) وليس في features/admin: الواجهة الإدارية وMaintenanceGuard
 * وusePlatformFeatureFlags تستهلك القيم نفسها، وطبقة core هي الطبقة المشتركة
 * السفلى التي يمكن لـ features الاستيراد منها دون كسر اتجاه الاعتماديات.
 *
 * ⚠ عند إضافة مفتاح ميزة جديد: حدّث هذه الواجهة + بذرة قاعدة البيانات
 * (migration 20260903000002) فقط — لا قيم افتراضية مكررة في أي ملف آخر.
 */

export interface PlatformFeatureFlags {
  ai_assistance: boolean;
  vin_intelligence: boolean;
  supplier_portal: boolean;
  internal_chat: boolean;
  offline_sync: boolean;
}

export interface MaintenanceModeConfig {
  enabled: boolean;
  message: string;
  estimated_end: string | null;
}

export const DEFAULT_FEATURE_FLAGS: PlatformFeatureFlags = {
  ai_assistance: true,
  vin_intelligence: true,
  supplier_portal: true,
  internal_chat: true,
  offline_sync: true,
};

export const DEFAULT_MAINTENANCE_MODE: MaintenanceModeConfig = {
  enabled: false,
  message: 'النظام يخضع حالياً لأعمال صيانة مجدولة لتحسين الخدمات. سنعود قريباً.',
  estimated_end: null,
};

/** Type-guard صارم لقيمة maintenance_mode القادمة من jsonb */
export const isMaintenanceModeConfig = (value: unknown): value is MaintenanceModeConfig => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.enabled === 'boolean' &&
    typeof record.message === 'string' &&
    (typeof record.estimated_end === 'string' || record.estimated_end === null)
  );
};
