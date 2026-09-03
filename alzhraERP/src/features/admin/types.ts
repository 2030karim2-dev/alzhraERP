export interface PlatformMetrics {
  total_companies: number;
  active_companies: number;
  trial_companies: number;
  suspended_companies: number;
  past_due_companies?: number;
  cancelled_companies?: number;
  total_users: number;
  total_invoices: number;
  today_invoices: number;
  total_ai_requests: number;
  ai_cache_hits: number;
  honeypot_alerts: number;
  csp_reports: number;
  fetched_at: string;
}

/** عدّادات الخدمات الحية من get_platform_service_telemetry (RPC جديد). */
export interface ServiceTelemetry {
  total_chat_messages: number;
  total_vin_analyses: number;
  total_supplier_price_rows: number;
}

export interface TrialExtensionResult {
  trial_ends_at: string;
  subscription_status: AdminCompany['subscription_status'];
}

export interface AdminCompany {
  id: string;
  name_ar: string;
  name_en: string | null;
  tax_number: string | null;
  base_currency: string;
  owner_id: string | null;
  owner_email: string | null;
  phone: string | null;
  is_active: boolean;
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';
  trial_ends_at: string | null;
  plan_id: string | null;
  plan_name: string | null;
  user_count: number;
  branch_count: number;
  invoice_count: number;
  created_at: string;
}

export interface SubscriptionPlan {
  id?: string | undefined;
  name_ar: string;
  name_en: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_products: number;
  max_invoices_monthly: number;
  ai_tokens_monthly: number;
  features: string[];
  is_active: boolean;
  color: string;
  sort_order: number;
  created_at?: string | undefined;
}

export interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
  is_super_admin: boolean;
  companies_count: number;
  company_names: string[];
}

export interface SystemPlatformConfigs {
  maintenance_mode: {
    enabled: boolean;
    message: string;
    estimated_end: string | null;
  };
  feature_flags: {
    ai_assistance: boolean;
    vin_intelligence: boolean;
    supplier_portal: boolean;
    internal_chat: boolean;
    offline_sync: boolean;
  };
}

export interface SecurityAlertLog {
  id: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alert_type: string;
  source_ip: string | null;
  user_agent: string | null;
  user_id: string | null;
  company_id: string | null;
  details: Record<string, unknown>;
  detected_at: string;
  resolved_at: string | null;
  resolved_by?: string | null;
  resolution_notes?: string | null;
}

/** Backward-compatibility alias */
export type SecurityHoneypotLog = SecurityAlertLog;

export interface CspReportLog {
  id: number | string;
  document_uri: string | null;
  blocked_uri: string | null;
  violated_directive: string | null;
  received_at: string;
}

export type AdminTab =
  'overview' | 'companies' | 'subscriptions' | 'users' | 'telemetry' | 'security' | 'settings';
