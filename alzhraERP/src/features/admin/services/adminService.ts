import { supabase } from '../../../lib/supabaseClient';
import type { Database, Json } from '../../../core/database.types';
import type {
  AdminCompany,
  AdminUser,
  CspReportLog,
  PlatformMetrics,
  SecurityAlertLog,
  SubscriptionPlan,
  SystemPlatformConfigs,
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
  price_monthly: row.price_monthly,
  price_yearly: row.price_yearly,
  max_users: row.max_users,
  max_products: row.max_products,
  max_invoices_monthly: row.max_invoices_monthly,
  ai_tokens_monthly: row.ai_tokens_monthly,
  features: row.features ?? [],
  is_active: row.is_active,
  color: row.color ?? '#3B82F6',
  sort_order: row.sort_order,
  created_at: row.created_at,
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
      ? (row.details as Record<string, unknown>)
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
    return !!data;
  },

  /**
   * تمديد الفترة التجريبية لشركة
   */
  async extendTrial(companyId: string, days: number): Promise<string> {
    const { data, error } = await supabase.rpc('extend_company_trial', {
      p_company_id: companyId,
      p_days: days,
    });
    if (error) throw error;
    return data ?? '';
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
    return !!data;
  },

  /**
   * جلب قائمة باقات الاشتراك
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toSubscriptionPlan);
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
      if (error) throw error;
      return toSubscriptionPlan(data);
    }

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return toSubscriptionPlan(data);
  },

  /**
   * حذف باقة اشتراك
   */
  async deleteSubscriptionPlan(planId: string): Promise<void> {
    const { error } = await supabase.from('subscription_plans').delete().eq('id', planId);
    if (error) throw error;
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
   * تعيين أو سحب صلاحية السوبر أدمن
   */
  async toggleSuperAdmin(userId: string, makeSuperAdmin: boolean): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_super_admin', {
      p_target_user_id: userId,
      p_make_super_admin: makeSuperAdmin,
    });
    if (error) throw error;
    return !!data;
  },

  /**
   * جلب إعدادات المنصة ومفاتيح الميزات
   */
  async getSystemConfigs(): Promise<SystemPlatformConfigs> {
    const { data, error } = await supabase.from('system_platform_configs').select('key, value');
    if (error) throw error;

    const configsMap = (data ?? []).reduce<Record<string, Json>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return {
      maintenance_mode: (configsMap[
        'maintenance_mode'
      ] as unknown as SystemPlatformConfigs['maintenance_mode']) ?? {
        enabled: false,
        message: 'النظام يخضع للصيانة',
        estimated_end: null,
      },
      feature_flags: (configsMap[
        'feature_flags'
      ] as unknown as SystemPlatformConfigs['feature_flags']) ?? {
        ai_assistance: true,
        vin_intelligence: true,
        supplier_portal: true,
        internal_chat: true,
        offline_sync: true,
      },
    };
  },

  /**
   * تحديث إعدادات المنصة
   */
  async updateSystemConfig(key: string, value: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('system_platform_configs').upsert({
      key,
      value: value as unknown as Json,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  /**
   * جلب تنبيهات الأمان (مصيدة Honeypot + rate-limit) من جدول security_alerts الحقيقي
   */
  async getHoneypotLogs(): Promise<SecurityAlertLog[]> {
    const { data, error } = await supabase
      .from('security_alerts')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map(toHoneypotLog);
  },

  /**
   * جلب تقارير انتهاك سياسة المتصفح (CSP)
   */
  async getCspReports(): Promise<CspReportLog[]> {
    const { data, error } = await supabase
      .from('csp_reports')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map(toCspReport);
  },
};
