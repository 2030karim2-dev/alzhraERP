import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import type {
  AdminCompany,
  AdminUser,
  CspReportLog,
  SecurityAlertLog,
  SubscriptionPlan,
} from '../types';
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

export const useAdminCompaniesCount = (params?: {
  search?: string | undefined;
  status?: string | undefined;
}) => {
  return useQuery({
    queryKey: ['admin_companies_count', params?.search, params?.status],
    queryFn: () => adminService.getCompaniesCount(params),
  });
};

export const useServiceTelemetry = () => {
  return useQuery({
    queryKey: ['admin_service_telemetry'],
    queryFn: () => adminService.getServiceTelemetry(),
    refetchInterval: 60000,
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
      void queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_companies_count'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_platform_metrics'] });
      showToast('تم تحديث حالة المنشأة بنجاح', 'success');
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'فشل في تحديث حالة المنشأة'), 'error');
    },
  });

  const extendTrialMutation = useMutation({
    mutationFn: ({ companyId, days }: { companyId: string; days: number }) =>
      adminService.extendTrial(companyId, days),
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_companies_count'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_platform_metrics'] });
      showToast(
        `تم تمديد الفترة التجريبية حتى ${new Date(result.trial_ends_at).toLocaleDateString('ar-SA')}`,
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
      void queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_companies_count'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_platform_metrics'] });
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
      void queryClient.invalidateQueries({ queryKey: ['admin_subscription_plans'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
      showToast('تم حفظ باقة الاشتراك بنجاح', 'success');
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'فشل في حفظ باقة الاشتراك'), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => adminService.deleteSubscriptionPlan(planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin_subscription_plans'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_companies'] });
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

export const useAdminUsersCount = (search?: string) => {
  return useQuery({
    queryKey: ['admin_users_count', search],
    queryFn: () => adminService.getUsersCount(search),
  });
};

export const useUserMutations = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  const toggleSuperAdminMutation = useMutation({
    mutationFn: ({ userId, makeSuperAdmin }: { userId: string; makeSuperAdmin: boolean }) =>
      adminService.toggleSuperAdmin(userId, makeSuperAdmin),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      void queryClient.invalidateQueries({ queryKey: ['is_super_admin'] });
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
        void queryClient.invalidateQueries({ queryKey: [...queryKey] });
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

/** حجم الصفحة الموحّد لكل جداول الإدارة (منشآت/مستخدمون/سجلات أمان/تقارير CSP). */
export const ADMIN_TABLE_PAGE_SIZE = 25;

/** اسم متوافق للاستخدامات السابقة — ترقيم صفحات مركز الأمان على الخادم. */
export const SECURITY_LOGS_PAGE_SIZE = ADMIN_TABLE_PAGE_SIZE;

export type SecurityStatusFilter = 'all' | 'unresolved' | 'resolved';

/** تحويل فلتر حالة الواجهة إلى معامل p_resolved الخادمي */
const toResolvedParam = (filter: SecurityStatusFilter): boolean | undefined =>
  filter === 'unresolved' ? false : filter === 'resolved' ? true : undefined;

/**
 * سجلات مركز الأمان + تقارير CSP.
 * لكل تبويب صفحته المستقلة: تنبيهات الأمان تستخدم `alertsPage` وتقارير CSP
 * تستخدم `cspPage` — فلا يزيح التنقل في أحد التبويبين ترقيم/استعلام الآخر.
 */
export const useSecurityLogs = (
  alertsPage: number,
  statusFilter: SecurityStatusFilter,
  cspPage: number
) => {
  const resolved = toResolvedParam(statusFilter);

  const alertsQuery = useQuery({
    queryKey: ['admin_security_alerts', alertsPage, statusFilter],
    queryFn: () =>
      adminService.getSecurityAlerts({
        limit: SECURITY_LOGS_PAGE_SIZE,
        offset: (alertsPage - 1) * SECURITY_LOGS_PAGE_SIZE,
        resolved,
      }),
  });

  const alertsCountQuery = useQuery({
    queryKey: ['admin_security_alerts_count', statusFilter],
    queryFn: () => adminService.getSecurityAlertsCount(resolved),
  });

  const cspQuery = useQuery({
    queryKey: ['admin_csp_reports', cspPage],
    queryFn: () =>
      adminService.getCspReportsPage({
        limit: SECURITY_LOGS_PAGE_SIZE,
        offset: (cspPage - 1) * SECURITY_LOGS_PAGE_SIZE,
      }),
  });

  const cspCountQuery = useQuery({
    queryKey: ['admin_csp_reports_count'],
    queryFn: () => adminService.getCspReportsCount(),
  });

  const toMessage = (err: unknown): string | null => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string' && err.trim() !== '') return err;
    return null;
  };

  return {
    securityAlerts: alertsQuery.data ?? [],
    securityAlertsTotal: alertsCountQuery.data ?? 0,
    isLoadingAlerts: alertsQuery.isLoading,
    isErrorAlerts: alertsQuery.isError,
    alertsError: toMessage(alertsQuery.error),
    cspReports: cspQuery.data ?? [],
    cspTotal: cspCountQuery.data ?? 0,
    isLoadingCsp: cspQuery.isLoading,
    isErrorCsp: cspQuery.isError,
    cspError: toMessage(cspQuery.error),
    refetch: () => {
      void alertsQuery.refetch();
      void alertsCountQuery.refetch();
      void cspQuery.refetch();
      void cspCountQuery.refetch();
    },
  };
};

export const useSecurityMutations = () => {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  const resolveAlertMutation = useMutation({
    mutationFn: ({ alertId, notes }: { alertId: number | string; notes?: string }) =>
      adminService.resolveSecurityAlert(alertId, notes),
    onSuccess: () => {
      // إبطال صريح لقوائم الصفحات وعدادها معاً: بادئة القوائم لا تطابق مفتاح
      // admin_security_alerts_count (المقطع الأول مختلف) فكان العداد يبقى قديماً.
      void queryClient.invalidateQueries({ queryKey: ['admin_security_alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_security_alerts_count'] });
      void queryClient.invalidateQueries({ queryKey: ['admin_platform_metrics'] });
      showToast('تمت معالجة التنبيه الأمني بنجاح', 'success');
    },
    onError: (err: unknown) => {
      showToast(errorMessage(err, 'تعذر معالجة التنبيه الأمني'), 'error');
    },
  });

  return {
    resolveAlert: resolveAlertMutation.mutateAsync,
    isResolvingAlert: resolveAlertMutation.isPending,
  };
};

// ---------------------------------------------------------------------------
// طبقة وصول للتصدير الكامل CSV (تتجاوز ترقيم صفحات الواجهة) — تُستهلك من
// المكونات عبر هذه الدوال لا عبر الاتصال المباشر بالخدمة.
// ---------------------------------------------------------------------------

/** كل المنشآت المطابقة للبحث/الحالة (يتجاوز الصفحة المعروضة). */
export const fetchAllAdminCompanies = (params?: {
  search?: string | undefined;
  status?: string | undefined;
}): Promise<AdminCompany[]> => adminService.exportAllCompanies(params);

/** كل المستخدمين المطابقين للبحث. */
export const fetchAllAdminUsers = (search?: string): Promise<AdminUser[]> =>
  adminService.exportAllUsers(search);

/** كل تنبيهات الأمان المطابقة لحالة المعالجة. */
export const fetchAllAdminSecurityAlerts = (resolved?: boolean): Promise<SecurityAlertLog[]> =>
  adminService.exportAllSecurityAlerts(resolved);

/** كل تقارير انتهاك سياسة CSP. */
export const fetchAllAdminCspReports = (): Promise<CspReportLog[]> =>
  adminService.exportAllCspReports();
