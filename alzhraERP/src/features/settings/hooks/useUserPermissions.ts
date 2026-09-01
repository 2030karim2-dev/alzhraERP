import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { permissionsApi } from '../api/permissionsApi';

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

const toCompanyMember = (
  item: {
    id: string;
    user_id: string;
    company_id: string;
    role: string;
    branch_id: string | null;
    created_at: string;
    updated_at: string;
    branches: { id: string; name: string } | null;
  },
  profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }>
): CompanyMember => ({
  id: item.id,
  user_id: item.user_id,
  company_id: item.company_id,
  role: item.role,
  branch_id: item.branch_id,
  created_at: item.created_at,
  updated_at: item.updated_at,
  branch: item.branches,
  profile: profilesMap[item.user_id] ?? null,
});

/**
 * Fetch all active members in the current company with their roles & branches
 */
export function useCompanyMembers(): UseQueryResult<CompanyMember[]> {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['company_members', user?.company_id],
    queryFn: async (): Promise<CompanyMember[]> => {
      if (user?.company_id == null) return [];

      const members = await permissionsApi.fetchCompanyMembers(user.company_id);
      if (members.length === 0) return [];

      const userIds = members.map(m => m.user_id).filter(id => id !== '');
      const profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> =
        {};

      if (userIds.length > 0) {
        const profiles = await permissionsApi.fetchProfiles(userIds);
        profiles.forEach(p => {
          if (p.id != null) {
            profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          }
        });
      }

      return members.map(item => toCompanyMember(item, profilesMap));
    },
    enabled: Boolean(user?.company_id),
  });
}

/**
 * Hook to get a target member's effective permissions (role default + custom grants)
 */
export function useMemberPermissions(
  targetUserId: string | null
): UseQueryResult<MemberEffectivePermissions | null> {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['member_permissions', user?.company_id, targetUserId],
    queryFn: async (): Promise<MemberEffectivePermissions | null> => {
      if (user?.company_id == null || targetUserId == null) return null;

      const data = await permissionsApi.getMemberEffectivePermissions(
        user.company_id,
        targetUserId
      );

      return data as MemberEffectivePermissions;
    },
    enabled: Boolean(user?.company_id) && Boolean(targetUserId),
  });
}

/**
 * Hook to update member custom permissions
 */
export function useUpdateMemberPermissions(): UseMutationResult<
  unknown,
  Error,
  { targetUserId: string; grantedPermissions: string[]; revokedPermissions?: string[] }
> {
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
    }): Promise<unknown> => {
      if (user?.company_id == null) throw new Error('لا توجد منشأة نشطة');

      return await permissionsApi.setMemberPermissions(
        user.company_id,
        targetUserId,
        grantedPermissions,
        revokedPermissions
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['member_permissions', user?.company_id, variables.targetUserId],
      });
      await queryClient.invalidateQueries({ queryKey: ['permissions'] });
      await queryClient.invalidateQueries({ queryKey: ['permission'] });
      showToast('تم حفظ وتحديث صلاحيات الموظف بنجاح', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'خطأ في حفظ صلاحيات الموظف', 'error');
    },
  });
}

/**
 * Hook to update a member's role and assigned branch
 */
export function useUpdateMemberRoleAndBranch(): UseMutationResult<
  unknown,
  Error,
  { userId: string; role: string; branchId: string | null }
> {
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
    }): Promise<unknown> => {
      if (user?.company_id == null) throw new Error('لا توجد منشأة نشطة');

      return await permissionsApi.updateMemberRoleAndBranch(
        user.company_id,
        userId,
        role,
        branchId
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company_members'] });
      await queryClient.invalidateQueries({ queryKey: ['member_permissions'] });
      await queryClient.invalidateQueries({ queryKey: ['permissions'] });
      await queryClient.invalidateQueries({ queryKey: ['permission'] });
      showToast('تم تحديث دور وفرع الموظف بنجاح', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'خطأ في تحديث بيانات الموظف', 'error');
    },
  });
}
