
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  name?: string; // Alias for full_name for backward compatibility
  avatar_url?: string | null;

  // تأتي الآن من جدول الربط (Join Table) و جدول roles_permissions
  role?: string;
  company_id?: string;
  company_name?: string;
  permissions?: string[];

  // بيانات الفرع - تُملأ من get_user_profile RPC
  branch_id?: string | null;
  branch_name?: string | null;
}

export interface LoginCredentials {
  email: string;
  pass: string;
}
