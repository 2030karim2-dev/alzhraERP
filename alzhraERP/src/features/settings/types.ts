
// Add missing SettingsSection type used in SettingsPage.tsx
export type SettingsSection = 'profile' | 'company' | 'financial' | 'appearance' | 'backup' | 'security' | 'notifications' | 'team' | 'invoice' | 'pos' | 'inventory' | 'print' | 'integrations' | 'localization' | 'branches' | 'preferences';

export interface Company {
  id: string;
  name_ar: string;
  name_en?: string | null;
  tax_number?: string | null;
  base_currency: string;
  owner_id: string;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  is_tax_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  company_id: string;
  address?: string | null;
  phone?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BranchFormData {
  name: string;
  address?: string | null;
  phone?: string | null;
  status?: string;
}

export interface CompanyFormData {
  name?: string;
  name_ar?: string;
  english_name?: string;
  name_en?: string | null;
  tax_number?: string | null;
  base_currency?: string;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
  is_tax_enabled?: boolean;
  [key: string]: unknown; // السماح بحقول إضافية للتوافق مع أعمدة DB المختلفة
}

export interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'accountant' | 'cashier' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_by?: string;
  token?: string;
  role_name?: string; // For UI display (legacy compat)
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  user_name?: string;
  created_at: string;
  details?: string;
}

export interface Warehouse {
  id: string;
  company_id?: string;
  branch_id?: string | null;
  name_ar: string;
  location: string | null;
  status: string;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface WarehouseFormData {
  name_ar: string;
  location: string;
  branch_id?: string | null;
}

export interface FiscalYear {
  id: string;
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

export interface FiscalYearFormData {
  name: string;
  start_date: string;
  end_date: string;
}

export interface SupportedCurrency {
  code: string;
  name_ar: string;
  symbol: string;
  is_base: boolean;
  exchange_operator: 'multiply' | 'divide';
}

export interface ExchangeRate {
  id: string;
  currency_code: string;
  rate_to_base: number;
  effective_date: string;
}

export interface ExchangeRateFormData {
  currency_code: string;
  rate_to_base: number;
  effective_date: string;
}

/**
 * Fix: Added missing AutoBackupConfig export as it is utilized by settingsService
 */
export interface AutoBackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  includeImages: boolean;
  lastBackupStatus: 'success' | 'failed' | 'idle';
  lastBackupTime?: string;
}
