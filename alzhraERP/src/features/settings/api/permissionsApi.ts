import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';

// الأنواع المولّدة تقيّد supabase.rpc بالدوال المعروفة وقت التوليد؛
// دوال الصلاحيات الدقيقة أحدث من تلك اللقطة — نوسّع التوقيع عمداً
// (نفس النمط في dashboard/api). عبر arrow لضمان ربط `this` بشكل سليم.
const looseRpc = async (
  name: string,
  args: Record<string, unknown>
): Promise<{ data: unknown; error: unknown }> => {
  const rpcFn = supabase.rpc as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: unknown; error: unknown }>;
  return await rpcFn(name, args);
};

/** طبقة api لصلاحيات/أعضاء المنشأة — تستدعيها الهوكات (Hook → API). */
export const permissionsApi = {
  fetchCompanyMembers: async (companyId: string) => {
    const { data, error } = await supabase
      .from('user_company_roles')
      .select(
        `
                id,
                user_id,
                company_id,
                role,
                branch_id,
                created_at,
                updated_at,
                branches(id, name)
            `
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('permissionsApi', 'Error fetching members', error);
      throw error;
    }
    return data ?? [];
  },

  fetchProfiles: async (userIds: string[]) => {
    if (userIds.length === 0) return [];
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    if (error) throw error;
    return data ?? [];
  },

  getMemberEffectivePermissions: async (companyId: string, targetUserId: string) => {
    const { data, error } = await looseRpc('get_member_effective_permissions', {
      p_target_user_id: targetUserId,
      p_company_id: companyId,
    });
    if (error) throw error;
    return data;
  },

  setMemberPermissions: async (
    companyId: string,
    targetUserId: string,
    grantedPermissions: string[],
    revokedPermissions: string[]
  ) => {
    const { data, error } = await looseRpc('set_member_permissions', {
      p_target_user_id: targetUserId,
      p_company_id: companyId,
      p_granted_permissions: grantedPermissions,
      p_revoked_permissions: revokedPermissions,
    });
    if (error) throw error;
    return data;
  },

  updateMemberRoleAndBranch: async (
    companyId: string,
    userId: string,
    role: string,
    branchId: string | null
  ) => {
    const { data, error } = await supabase
      .from('user_company_roles')
      .update({
        role,
        branch_id: branchId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
