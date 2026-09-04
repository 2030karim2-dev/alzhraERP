import { supabase } from '../../../lib/supabaseClient';
import type { Database, Json } from '../../../core/database.types';
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MAINTENANCE_MODE,
  isMaintenanceModeConfig,
  type MaintenanceModeConfig,
} from '../../../core/config/platformDefaults';
import type {
  AdminCompany,
  AdminUser,
  CspReportLog,
  PlatformMetrics,
  SecurityAlertLog,
  ServiceTelemetry,
  SubscriptionPlan,
  SystemPlatformConfigs,
  TrialExtensionResult,
} from '../types';

// أنواع مستمدة من مخطط قاعدة البيانات المُولّد (تبقي هذا الملف خالياً من `any`)
type SubscriptionPlanRow = Database['public']['Tables']['subscription_plans']['Row'];
type SecurityAlertRow = Database['public']['Tables']['security_alerts']['Row'];
type CspReportRow = Database['public']['Tables']['csp_reports']['Row'];
type AdminCompanyRow =
  Database['public']['Functions']['get_admin_companies_list']['Returns'][number];
type AdminUserRow = Database['public']['Functions']['get_admin_users_list']['Returns'][number];

const toSubscriptionPlan = (row: SubscriptionPlanRow): SubscriptionPlan => ({
  id: row.id,
  name_ar: row.name_ar,
  name_en: row.name_en ?? '',
  price_monthly: row.price_monthly ?? 0,
  price_yearly: row.price_yearly ?? 0,
  max_users: row.max_users ?? 0,
  max_products: row.max_products ?? 0,
  max_invoices_monthly: row.max_invoices_monthly ?? 0,
  ai_tokens_monthly: row.ai_tokens_monthly ?? 0,
  features: Array.isArray(row.features)
    ? row.features.filter((item): item is string => typeof item === 'string')
    : [],
  is_active: row.is_active ?? true,
  color: row.color ?? '#3B82F6',
  sort_order: row.sort_order ?? 0,
  created_at: row.created_at ?? undefined,
});

const toAdminCompany = (row: AdminCompanyRow): AdminCompany => ({
  id: row.id,
  name_ar: row.name_ar,
  name_en: row.name_en,
  tax_number: row.tax_number,
  base_currency: row.base_currency,
  owner_id: row.owner_id,
  owner_email: row.owner_email,
  phone: row.phone,
  is_active: row.is_active,
  subscription_status: row.subscription_status as AdminCompany['subscription_status'],
  trial_ends_at: row.trial_ends_at,
  plan_id: row.plan_id,
  plan_name: row.plan_name,
  user_count: row.user_count,
  branch_count: row.branch_count,
  invoice_count: row.invoice_count,
  created_at: row.created_at,
});

const toAdminUser = (row: AdminUserRow): AdminUser => ({
  user_id: row.user_id,
  email: row.email,
  created_at: row.created_at,
  is_super_admin: row.is_super_admin,
  companies_count: row.companies_count,
  company_names: row.company_names ?? [],
});

/**
 * تحويل سجل security_alerts (مصدر تنبيهات الأمان الحقيقي — لا يوجد جدول
 * security_honeypot_logs في قاعدة البيانات) إلى شكل الواجهة.
 */
const toHoneypotLog = (row: SecurityAlertRow): SecurityAlertLog => {
  const details: Record<string, unknown> =
    row.details !== null && typeof row.details === 'object' && !Array.isArray(row.details)
      ? row.details
      : {};

  return {
    id: row.id,
    severity: row.severity as SecurityAlertLog['severity'],
    alert_type: row.alert_type,
    source_ip: row.source_ip,
    user_agent: row.user_agent,
    user_id: row.user_id,
    company_id: row.company_id,
    details,
    detected_at: row.detected_at,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    resolution_notes: row.resolution_notes,
  };
};

/** تحويل تقرير CSP: عمود الوقت الفعلي في الجدول هو received_at وليس created_at */
const toCspReport = (row: CspReportRow): CspReportLog => ({
  id: row.id,
  document_uri: row.document_uri,
  blocked_uri: row.blocked_uri,
  violated_directive: row.violated_directive,
  received_at: row.received_at,
});

export const adminService = {
  /**
   * جلب إحصائيات النظام الشاملة عبر RPC محمي
   */
  async getMetrics(): Promise<PlatformMetrics> {
    const { data, error } = await supabase.rpc('get_platform_system_metrics');
    if (error) throw error;
    return (data ?? {}) as unknown as PlatformMetrics;
  },

  /**
   * جلب عدّادات الخدمات الحية (محادثات/تحليلات VIN/أسعار موردين)
   */
  async getServiceTelemetry(): Promise<ServiceTelemetry> {
    const { data, error } = await supabase.rpc('get_platform_service_telemetry');
    if (error) throw error;
    return (data ?? {}) as unknown as ServiceTelemetry;
  },

  /**
   * جلب قائمة الشركات المشتركة مع فلترة وبحث
   */
  async getCompanies(params?: {
    search?: string | undefined;
    status?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<AdminCompany[]> {
    const { data, error } = await supabase.rpc('get_admin_companies_list', {
      p_search: params?.search?.trim() || null,
      p_status: params?.status || null,
      p_limit: params?.limit ?? 50,
      p_offset: params?.offset ?? 0,
    });
    if (error) throw error;
    return (data ?? []).map(toAdminCompany);
  },

  /**
   * إجمالي عدد المنشآت المطابقة (لحساب صفحات القائمة بدقة)
   */
  async getCompaniesCount(params?: {
    search?: string | undefined;
    status?: string | undefined;
  }): Promise<number> {
    const { data, error } = await supabase.rpc('get_admin_companies_count', {
      p_search: params?.search?.trim() || null,
      p_status: params?.status || null,
    });
    if (error) throw error;
    return data ?? 0;
  },

  /**
   * تفعيل أو تعليق منشأة
   */
  async toggleCompanyStatus(
    companyId: string,
    isActive: boolean,
    status: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_company_status', {
      p_company_id: companyId,
      p_is_active: isActive,
      p_status: status,
    });
    if (error) throw error;
    return data;
  },

  /**
   * تمديد الفترة التجريبية لشركة وإرجاع التاريخ والحالة المحدثة
   */
  async extendTrial(companyId: string, days: number): Promise<TrialExtensionResult> {
    const { data, error } = await supabase.rpc('extend_company_trial', {
      p_company_id: companyId,
      p_days: days,
    });
    if (error) throw error;
    const res = data as unknown as { trial_ends_at?: string; subscription_status?: string };
    return {
      trial_ends_at: res?.trial_ends_at ?? '',
      subscription_status: (res?.subscription_status ??
        'trial') as AdminCompany['subscription_status'],
    };
  },

  /**
   * تعيين / إزالة باقة اشتراك لمنشأة (RPC admin_assign_company_plan)
   */
  async assignCompanyPlan(companyId: string, planId: string | null): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_assign_company_plan', {
      p_company_id: companyId,
      p_plan_id: planId,
    });
    if (error) throw error;
    return data;
  },

  /**
   * جلب قائمة باقات الاشتراك مع حساب عدد الشركات المرتبطة بكل باقة
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;

    const companyCounts = new Map<string, number>();
    try {
      const { data: companiesData } = await supabase
        .from('companies')
        .select('plan_id')
        .not('plan_id', 'is', null);

      if (companiesData) {
        for (const row of companiesData) {
          if (row.plan_id) {
            companyCounts.set(row.plan_id, (companyCounts.get(row.plan_id) ?? 0) + 1);
          }
        }
      }
    } catch {
      // في حال تعذر احتساب المنشآت، يستمر العرض دون إيقاف الواجهة
    }

    return (data ?? []).map(row => {
      const plan = toSubscriptionPlan(row);
      if (plan.id) {
        plan.companies_count = companyCounts.get(plan.id) ?? 0;
      }
      return plan;
    });
  },

  /**
   * حفظ أو تحديث خطة اشتراك
   */
  async saveSubscriptionPlan(plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const payload = {
      name_ar: plan.name_ar ?? '',
      name_en: plan.name_en ?? '',
      price_monthly: plan.price_monthly ?? 0,
      price_yearly: plan.price_yearly ?? 0,
      max_users: plan.max_users ?? 5,
      max_products: plan.max_products ?? 1000,
      max_invoices_monthly: plan.max_invoices_monthly ?? 500,
      ai_tokens_monthly: plan.ai_tokens_monthly ?? 100000,
      features: plan.features ?? [],
      is_active: plan.is_active ?? true,
      color: plan.color ?? '#3B82F6',
      sort_order: plan.sort_order ?? 0,
    };

    if (plan.id) {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(payload)
        .eq('id', plan.id)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('اسم باقة الاشتراك مسجل مسبقاً، يرجى اختيار اسم مختلف');
        }
        throw error;
      }
      return toSubscriptionPlan(data);
    }

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(payload)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new Error('اسم باقة الاشتراك مسجل مسبقاً، يرجى اختيار اسم مختلف');
      }
      throw error;
    }
    return toSubscriptionPlan(data);
  },

  /**
   * حذف باقة اشتراك مع حماية تكامل البيانات
   */
  async deleteSubscriptionPlan(planId: string): Promise<void> {
    const { error } = await supabase.from('subscription_plans').delete().eq('id', planId);
    if (error) {
      if (
        error.code === '23503' ||
        error.message?.includes('foreign key') ||
        error.message?.includes('companies')
      ) {
        throw new Error(
          'لا يمكن حذف هذه الباقة لوجود منشآت مشتركة بها حالياً. قم بإلغاء أو تعديل اشتراك المنشآت أولاً.'
        );
      }
      throw error;
    }
  },

  /**
   * جلب المستخدمين على مستوى المنظومة
   */
  async getUsers(params?: {
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<AdminUser[]> {
    const { data, error } = await supabase.rpc('get_admin_users_list', {
      p_search: params?.search?.trim() || null,
      p_limit: params?.limit ?? 50,
      p_offset: params?.offset ?? 0,
    });
    if (error) throw error;
    return (data ?? []).map(toAdminUser);
  },

  /**
   * إجمالي عدد المستخدمين المطابقين (لحساب صفحات دليل المستخدمين بدقة)
   */
  async getUsersCount(search?: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_admin_users_count', {
      p_search: search?.trim() || null,
    });
    if (error) throw error;
    return data ?? 0;
  },

  /**
   * تعيين أو سحب صلاحية السوبر أدمن
   */
  async toggleSuperAdmin(userId: string, makeSuperAdmin: boolean): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_super_admin', {
      p_target_user_id: userId,
      p_make_super_admin: makeSuperAdmin,
    });
    if (error) throw error;
    return data;
  },

  /**
   * جلب إعداد وضع الصيانة مباشرة من جدول system_platform_configs
   * (للاستخدام في MaintenanceGuard لتجنب استيراد supabase داخل المكون)
   */
  async getMaintenanceConfig(): Promise<MaintenanceModeConfig> {
    const { data, error } = await supabase
      .from('system_platform_configs')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_MAINTENANCE_MODE;
    }

    return isMaintenanceModeConfig(data.value) ? data.value : DEFAULT_MAINTENANCE_MODE;
  },

  /**
   * جلب إعدادات المنصة ومفاتيح الميزات مع دمج الحقول الافتراضية دفاعياً
   */
  async getSystemConfigs(): Promise<SystemPlatformConfigs> {
    const { data, error } = await supabase.from('system_platform_configs').select('key, value');
    if (error) throw error;

    const configsMap = (data ?? []).reduce<Record<string, Json>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    // القيم الافتراضية من المصدر الموحد core/config/platformDefaults
    const defaultMaintenance: SystemPlatformConfigs['maintenance_mode'] = DEFAULT_MAINTENANCE_MODE;
    const defaultFlags: SystemPlatformConfigs['feature_flags'] = DEFAULT_FEATURE_FLAGS;

    const rawMaintenance = configsMap.maintenance_mode;
    const maintenanceMode: SystemPlatformConfigs['maintenance_mode'] =
      rawMaintenance && typeof rawMaintenance === 'object' && !Array.isArray(rawMaintenance)
        ? {
            ...defaultMaintenance,
            ...(rawMaintenance as unknown as Partial<SystemPlatformConfigs['maintenance_mode']>),
          }
        : defaultMaintenance;

    const rawFlags = configsMap.feature_flags;
    const featureFlags: SystemPlatformConfigs['feature_flags'] =
      rawFlags && typeof rawFlags === 'object' && !Array.isArray(rawFlags)
        ? {
            ...defaultFlags,
            ...(rawFlags as unknown as Partial<SystemPlatformConfigs['feature_flags']>),
          }
        : defaultFlags;

    return {
      maintenance_mode: maintenanceMode,
      feature_flags: featureFlags,
    };
  },

  /**
   * تحديث إعدادات المنصة عبر RPC محمي وموثق بالتدقيق الأمني
   */
  async updateSystemConfig(key: string, value: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.rpc('admin_update_system_config', {
      p_key: key,
      p_value: value as unknown as Json,
    });
    if (error) throw error;
  },

  /**
   * معالجة تنبيه أمني وتوثيقه في سجل التدقيق
   */
  async resolveSecurityAlert(alertId: number | string, notes?: string): Promise<boolean> {
    const numericId = typeof alertId === 'number' ? alertId : parseInt(alertId, 10);
    const { data, error } = await supabase.rpc('admin_resolve_security_alert', {
      p_alert_id: numericId,
      p_notes: notes || null,
    });
    if (error) throw error;
    return data;
  },

  /**
   * جلب صفحة من تنبيهات الأمان عبر RPC محمي (ترقيم صفحات وفلترة حالة المعالجة
   * على الخادم — ترحيل 20260904000008) بدل القراءة المباشرة المحدودة بـ 50 سجلاً.
   */
  async getSecurityAlerts(params?: {
    limit?: number | undefined;
    offset?: number | undefined;
    resolved?: boolean | undefined;
  }): Promise<SecurityAlertLog[]> {
    const { data, error } = await supabase.rpc('get_security_alerts_page', {
      p_limit: params?.limit ?? 50,
      p_offset: params?.offset ?? 0,
      p_resolved: params?.resolved ?? null,
    });
    if (error) throw error;
    return ((data ?? []) as unknown as SecurityAlertRow[]).map(toHoneypotLog);
  },

  /**
   * عدد تنبيهات الأمان المطابقة لفلتر حالة المعالجة (لترقيم الصفحات بدقة)
   */
  async getSecurityAlertsCount(resolved?: boolean): Promise<number> {
    const { data, error } = await supabase.rpc('get_security_alerts_count', {
      p_resolved: resolved ?? null,
    });
    if (error) throw error;
    return data ?? 0;
  },

  /**
   * جلب صفحة من تقارير انتهاك سياسة المتصفح (CSP) عبر RPC محمي
   */
  async getCspReportsPage(params?: {
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<CspReportLog[]> {
    const { data, error } = await supabase.rpc('get_csp_reports_page', {
      p_limit: params?.limit ?? 50,
      p_offset: params?.offset ?? 0,
    });
    if (error) throw error;
    return ((data ?? []) as unknown as CspReportRow[]).map(toCspReport);
  },

  /**
   * إجمالي تقارير CSP (لترقيم الصفحات)
   */
  async getCspReportsCount(): Promise<number> {
    const { data, error } = await supabase.rpc('get_csp_reports_count');
    if (error) throw error;
    return data ?? 0;
  },

  /** حجم الشريحة لتصدير قوائم المنشآت/المستخدمين (لا يوجد حد خادمي صريح). */
  EXPORT_LIST_CHUNK: 500,

  /** الحد الأقصى لكل استدعاء في get_security_alerts_page/get_csp_reports_page (200 خادمياً). */
  EXPORT_SECURITY_CHUNK: 200,

  /**
   * جلب كل المنشآت المطابقة للبحث/الحالة عبر تجزئة متسلسلة — للتصدير الكامل CSV
   * (الواجهة تعرض صفحة واحدة فقط بحجم ADMIN_TABLE_PAGE_SIZE).
   */
  async exportAllCompanies(params?: {
    search?: string | undefined;
    status?: string | undefined;
  }): Promise<AdminCompany[]> {
    const chunk = this.EXPORT_LIST_CHUNK;
    const out: AdminCompany[] = [];
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.rpc('get_admin_companies_list', {
        p_search: params?.search?.trim() || null,
        p_status: params?.status || null,
        p_limit: chunk,
        p_offset: offset,
      });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) break;
      out.push(...rows.map(toAdminCompany));
      if (rows.length < chunk) break;
      offset += chunk;
    }
    return out;
  },

  /**
   * جلب كل المستخدمين المطابقين للبحث — للتصدير الكامل CSV.
   */
  async exportAllUsers(search?: string): Promise<AdminUser[]> {
    const chunk = this.EXPORT_LIST_CHUNK;
    const out: AdminUser[] = [];
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.rpc('get_admin_users_list', {
        p_search: search?.trim() || null,
        p_limit: chunk,
        p_offset: offset,
      });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) break;
      out.push(...rows.map(toAdminUser));
      if (rows.length < chunk) break;
      offset += chunk;
    }
    return out;
  },

  /**
   * جلب كل تنبيهات الأمان المطابقة لحالة المعالجة — للتصدير الكامل.
   * (ترحيل 20260904000008 يفرض حد 200 للاستدعاء → تجزئة متسلسلة.)
   */
  async exportAllSecurityAlerts(resolved?: boolean): Promise<SecurityAlertLog[]> {
    const chunk = this.EXPORT_SECURITY_CHUNK;
    const out: SecurityAlertLog[] = [];
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.rpc('get_security_alerts_page', {
        p_limit: chunk,
        p_offset: offset,
        p_resolved: resolved ?? null,
      });
      if (error) throw error;
      const rows = (data ?? []) as unknown as SecurityAlertRow[];
      if (rows.length === 0) break;
      out.push(...rows.map(toHoneypotLog));
      if (rows.length < chunk) break;
      offset += chunk;
    }
    return out;
  },

  /**
   * جلب كل تقارير CSP — للتصدير الكامل (تجزئة متسلسلة بحد 200 خادمياً).
   */
  async exportAllCspReports(): Promise<CspReportLog[]> {
    const chunk = this.EXPORT_SECURITY_CHUNK;
    const out: CspReportLog[] = [];
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.rpc('get_csp_reports_page', {
        p_limit: chunk,
        p_offset: offset,
      });
      if (error) throw error;
      const rows = (data ?? []) as unknown as CspReportRow[];
      if (rows.length === 0) break;
      out.push(...rows.map(toCspReport));
      if (rows.length < chunk) break;
      offset += chunk;
    }
    return out;
  },
};
