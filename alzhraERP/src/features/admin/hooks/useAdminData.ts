import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import type { SubscriptionPlan } from '../types';
import { useFeedbackStore } from '../../feedback/store';
import { parseError } from '../../../core/utils/errorUtils';

const errorMessage = (err: unknown, fallback: string): string => {
  const parsed = parseError(err);
  return parsed.message === 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' ? fallback : parsed.message;
};

export const usePlatformMetrics = () => {
  return useQuery({
    queryKey: ['admin_platform_metrics'],
    queryFn: () => adminService.getMetrics(),
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useAdminCompanies = (params?: {
  search?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}) => {
  return useQuery({
    queryKey: ['admin_companies', params?.search, params?.status, params?.limit, params?.offset],
    queryFn: () => adminService.getCompanies(params),
  });
};

export const useCompanyMutations = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  const toggleStatusMutation = useMutation({
    mutationFn: ({
      companyId,
      isActive,
      status,
    }: {
      companyId: string;
      isActive: boolean;
      status: string;
    }) => adminService.toggleCompanyStatus(companyId, isActive, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin_platform_metrics'] });
      showToast('تم تحديث حالة المنشأة بنجاح', 'success');
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'فشل في تحديث حالة المنشأة'), 'error');
    },
  });

  const extendTrialMutation = useMutation({
    mutationFn: ({ companyId, days }: { companyId: string; days: number }) =>
      adminService.extendTrial(companyId, days),
    onSuccess: newExpiry => {
      queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin_platform_metrics'] });
      showToast(
        `تم تمديد الفترة التجريبية حتى ${new Date(newExpiry).toLocaleDateString('ar-SA')}`,
        'success'
      );
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'فشل في تمديد الفترة التجريبية'), 'error');
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: ({ companyId, planId }: { companyId: string; planId: string | null }) =>
      adminService.assignCompanyPlan(companyId, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      showToast('تم تعيين الباقة للمنشأة بنجاح', 'success');
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'تعذر تعيين الباقة للمنشأة'), 'error');
    },
  });

  return {
    toggleStatus: toggleStatusMutation.mutateAsync,
    isToggling: toggleStatusMutation.isPending,
    extendTrial: extendTrialMutation.mutateAsync,
    isExtending: extendTrialMutation.isPending,
    assignPlan: assignPlanMutation.mutateAsync,
    isAssigningPlan: assignPlanMutation.isPending,
  };
};

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['admin_subscription_plans'],
    queryFn: () => adminService.getSubscriptionPlans(),
  });
};

export const usePlanMutations = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  const saveMutation = useMutation({
    mutationFn: (plan: Partial<SubscriptionPlan>) => adminService.saveSubscriptionPlan(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_subscription_plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      showToast('تم حفظ باقة الاشتراك بنجاح', 'success');
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'فشل في حفظ باقة الاشتراك'), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => adminService.deleteSubscriptionPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_subscription_plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      showToast('تم حذف باقة الاشتراك بنجاح', 'success');
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'فشل في حذف باقة الاشتراك'), 'error');
    },
  });

  return {
    savePlan: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deletePlan: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export const useAdminUsers = (params?: {
  search?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}) => {
  return useQuery({
    queryKey: ['admin_users', params?.search, params?.limit, params?.offset],
    queryFn: () => adminService.getUsers(params),
  });
};

export const useUserMutations = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  const toggleSuperAdminMutation = useMutation({
    mutationFn: ({ userId, makeSuperAdmin }: { userId: string; makeSuperAdmin: boolean }) =>
      adminService.toggleSuperAdmin(userId, makeSuperAdmin),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      showToast(
        vars.makeSuperAdmin
          ? 'تمت ترقية المستخدم إلى سوبر أدمن بنجاح'
          : 'تم سحب صلاحية السوبر أدمن بنجاح',
        'success'
      );
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'تعذر تعديل صلاحية السوبر أدمن'), 'error');
    },
  });

  return {
    toggleSuperAdmin: toggleSuperAdminMutation.mutateAsync,
    isTogglingSuperAdmin: toggleSuperAdminMutation.isPending,
  };
};

export const useSystemConfigs = () => {
  return useQuery({
    queryKey: ['admin_system_configs'],
    queryFn: () => adminService.getSystemConfigs(),
  });
};

/**
 * مفاتيح الكاش التي يجب إبطالها بعد أي تعديل على إعدادات المنصة حتى ينتشر
 * التغيير فوراً إلى واجهة الإدارة و MaintenanceGuard و FeatureFlagGate.
 */
const PLATFORM_CONFIG_QUERY_KEYS = [
  ['admin_system_configs'],
  ['platform_maintenance_mode'],
  ['platform_feature_flags'],
] as const;

export const useConfigMutations = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  const updateConfigMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) =>
      adminService.updateSystemConfig(key, value),
    onSuccess: () => {
      for (const queryKey of PLATFORM_CONFIG_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [...queryKey] });
      }
      showToast('تم تحديث إعدادات المنصة بنجاح', 'success');
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'تعذر تحديث إعدادات المنصة'), 'error');
    },
  });

  return {
    updateConfig: updateConfigMutation.mutateAsync,
    isUpdating: updateConfigMutation.isPending,
  };
};

export const useSecurityLogs = () => {
  const honeypotQuery = useQuery({
    queryKey: ['admin_honeypot_logs'],
    queryFn: () => adminService.getHoneypotLogs(),
  });

  const cspQuery = useQuery({
    queryKey: ['admin_csp_reports'],
    queryFn: () => adminService.getCspReports(),
  });

  const toMessage = (err: unknown): string | null =>
    err instanceof Error ? err.message : err ? String(err) : null;

  return {
    honeypotLogs: honeypotQuery.data || [],
    isLoadingHoneypot: honeypotQuery.isLoading,
    isErrorHoneypot: honeypotQuery.isError,
    honeypotError: toMessage(honeypotQuery.error),
    cspReports: cspQuery.data || [],
    isLoadingCsp: cspQuery.isLoading,
    isErrorCsp: cspQuery.isError,
    cspError: toMessage(cspQuery.error),
    refetch: () => {
      honeypotQuery.refetch();
      cspQuery.refetch();
    },
  };
};
