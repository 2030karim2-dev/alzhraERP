import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { logger } from '../../../core/utils/logger';

export interface CompanyMember {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
}

export interface MemberEffectivePermissions {
  user_id: string;
  company_id: string;
  role: string;
  branch_id: string | null;
  role_permissions: string[];
  granted_permissions: string[];
  revoked_permissions: string[];
}

/**
 * Fetch all active members in the current company with their roles & branches
 */
export function useCompanyMembers() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['company_members', user?.company_id],
    queryFn: async (): Promise<CompanyMember[]> => {
      if (!user?.company_id) return [];

      const { data, error } = await supabase
        .from('user_company_roles')
        .select(`
          id,
          user_id,
          company_id,
          role,
          branch_id,
          created_at,
          updated_at,
          branches(id, name)
        `)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('useCompanyMembers', 'Error fetching members', error);
        throw error;
      }

      if (!data || data.length === 0) return [];

      const userIds = data.map((d: any) => d.user_id).filter(Boolean);
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (!profError && profiles) {
          profiles.forEach((p: any) => {
            profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          });
        }
      }

      return data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        company_id: item.company_id,
        role: item.role,
        branch_id: item.branch_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        branch: item.branches,
        profile: profilesMap[item.user_id] || null,
      }));
    },
    enabled: !!user?.company_id,
  });
}

/**
 * Hook to get a target member's effective permissions (role default + custom grants)
 */
export function useMemberPermissions(targetUserId: string | null) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['member_permissions', user?.company_id, targetUserId],
    queryFn: async (): Promise<MemberEffectivePermissions | null> => {
      if (!user?.company_id || !targetUserId) return null;

      const { data, error } = await supabase.rpc('get_member_effective_permissions', {
        p_target_user_id: targetUserId,
        p_company_id: user.company_id,
      });

      if (error) {
        logger.error('useMemberPermissions', 'RPC error', error);
        throw error;
      }

      return data as MemberEffectivePermissions;
    },
    enabled: !!user?.company_id && !!targetUserId,
  });
}

/**
 * Hook to update member custom permissions
 */
export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      grantedPermissions,
      revokedPermissions = [],
    }: {
      targetUserId: string;
      grantedPermissions: string[];
      revokedPermissions?: string[];
    }) => {
      if (!user?.company_id) throw new Error('لا توجد منشأة نشطة');

      const { data, error } = await supabase.rpc('set_member_permissions', {
        p_target_user_id: targetUserId,
        p_company_id: user.company_id,
        p_granted_permissions: grantedPermissions,
        p_revoked_permissions: revokedPermissions,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member_permissions', user?.company_id, variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission'] });
      showToast('تم حفظ وتحديث صلاحيات الموظف بنجاح', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'خطأ في حفظ صلاحيات الموظف', 'error');
    },
  });
}

/**
 * Hook to update a member's role and assigned branch
 */
export function useUpdateMemberRoleAndBranch() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      branchId,
    }: {
      userId: string;
      role: string;
      branchId: string | null;
    }) => {
      if (!user?.company_id) throw new Error('لا توجد منشأة نشطة');

      const { data, error } = await supabase
        .from('user_company_roles')
        .update({
          role,
          branch_id: branchId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('company_id', user.company_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_members'] });
      queryClient.invalidateQueries({ queryKey: ['member_permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission'] });
      showToast('تم تحديث دور وفرع الموظف بنجاح', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'خطأ في تحديث بيانات الموظف', 'error');
    },
  });
}
