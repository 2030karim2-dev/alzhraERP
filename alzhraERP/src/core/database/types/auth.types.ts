import { TableRow, TableInsert, TableUpdate } from './common.types';

// ============================================
// Companies & Tenants
// ============================================
export type DBCompany = TableRow<'companies'>;
export type DBCompanyInsert = TableInsert<'companies'>;
export type DBCompanyUpdate = TableUpdate<'companies'>;

export type DBUserCompanyRole = TableRow<'user_company_roles'>;
export type DBUserCompanyRoleInsert = TableInsert<'user_company_roles'>;

// For the `users` table, which is usually managed by auth.users in Supabase,
// we often reference it via profiles.
export type DBProfile = TableRow<'profiles'>;
