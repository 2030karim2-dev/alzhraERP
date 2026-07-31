
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from './service';
import { settingsApi } from './api';
import { useAuthStore } from '../auth/store';
import { useFeedbackStore } from '../feedback/store';
import { CompanyFormData, WarehouseFormData, FiscalYearFormData, ExchangeRateFormData, BranchFormData } from './types';

export const useCompany = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['company', user?.company_id],
    queryFn: () => user?.company_id ? settingsService.fetchCompany(user.company_id) : Promise.resolve(null),
    enabled: !!user?.company_id
  });
};

export const useCompanyMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  return useMutation({
    mutationFn: (data: CompanyFormData) => {
      if (!user?.company_id) throw new Error("No Company ID");
      return settingsService.updateCompanyProfile(user.company_id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      showToast("تم تحديث بيانات المنشأة بنجاح", 'success');
    }
  });
};

export const useWarehouses = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['warehouses', user?.company_id],
    queryFn: () => user?.company_id ? settingsService.fetchWarehouses(user.company_id) : Promise.resolve([]),
    enabled: !!user?.company_id
  });
};

export const useWarehouseMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const addWarehouse = useMutation({
    mutationFn: (data: WarehouseFormData) => {
      if (!user?.company_id) throw new Error("No Company ID");
      return settingsService.addWarehouse(user.company_id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      showToast("تمت إضافة المستودع الجديد", 'success');
    }
  });

  const deleteWarehouse = useMutation({
    mutationFn: (id: string) => settingsService.removeWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      showToast("تم حذف المستودع", 'info');
    }
  });

  const setPrimary = useMutation({
    mutationFn: (id: string) => {
      if (!user?.company_id) throw new Error("No Company ID");
      return settingsApi.setPrimaryWarehouse(user.company_id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      showToast("تم تعيين المستودع الرئيسي بنجاح", 'success');
    }
  });

  return { addWarehouse: addWarehouse.mutate, deleteWarehouse: deleteWarehouse.mutate, setPrimary: setPrimary.mutate, isAdding: addWarehouse.isPending };
};

export const useFiscalYears = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['fiscal_years', user?.company_id],
    queryFn: () => user?.company_id ? settingsService.fetchFiscalYears(user.company_id) : Promise.resolve([]),
    enabled: !!user?.company_id
  });
};

export const useFiscalYearMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const addFiscalYear = useMutation({
    mutationFn: (data: FiscalYearFormData) => {
      if (!user?.company_id) throw new Error("No Company ID");
      return settingsService.addFiscalYear(user.company_id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      showToast("تم إنشاء السنة المالية بنجاح", 'success');
    }
  });

  const closeFiscalYear = useMutation({
    mutationFn: (id: string) => settingsService.closeFiscalYear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      showToast("تم إغلاق السنة المالية بنجاح", 'warning');
    }
  });

  return { addFiscalYear: addFiscalYear.mutate, closeFiscalYear: closeFiscalYear.mutate, isAdding: addFiscalYear.isPending };
};

export const useCurrencies = () => {
  const { user } = useAuthStore();
  const currencies = useQuery({ queryKey: ['supported_currencies'], queryFn: settingsService.fetchCurrencies });
  const rates = useQuery({ queryKey: ['exchange_rates', user?.company_id], queryFn: () => user?.company_id ? settingsService.fetchExchangeRates(user.company_id) : Promise.resolve([]), enabled: !!user?.company_id });
  return { currencies, rates };
};

export const useCurrencyMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const setRate = useMutation({
    mutationFn: (data: ExchangeRateFormData) => {
      if (!user?.company_id || !user?.id) throw new Error("Missing Auth");
      return settingsService.setExchangeRate(user.company_id, data, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange_rates'] });
      showToast("تم تحديث سعر الصرف بنجاح", 'success');
    }
  });

  const addCurrency = useMutation({
    mutationFn: (data: { code: string, name_ar: string, symbol: string, exchange_operator: 'multiply' | 'divide' }) => settingsApi.createCurrency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supported_currencies'] });
      showToast("تمت إضافة العملة الجديدة", 'success');
    }
  });

  const deleteCurrency = useMutation({
    mutationFn: (code: string) => settingsApi.deleteCurrency(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supported_currencies'] });
      showToast("تم حذف العملة من النظام", 'info');
    }
  });

  const refreshRates = useMutation({
    mutationFn: () => settingsService.refreshMarketRates(user?.company_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange_rates'] });
      showToast("تم تحديث أسعار الصرف من السوق بنجاح", 'success');
    },
    onError: (error: any) => {
      showToast(error.message || "فشل تحديث الأسعار من السوق", 'error');
    }
  });

  return {
    setRate: setRate.mutate,
    addCurrency: addCurrency.mutate,
    deleteCurrency: deleteCurrency.mutate,
    refreshRates: refreshRates.mutate,
    isSaving: setRate.isPending || addCurrency.isPending || refreshRates.isPending
  };
};

export const useBackupActions = () => {
  const { showToast } = useFeedbackStore();

  const exportData = async () => {
    try {
      showToast("جاري تجهيز النسخة الاحتياطية...", 'info');
      const data = await settingsService.exportSystemData();

      const fileName = `AlZahra_Backup_${new Date().toISOString().split('T')[0]}`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.json`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("تم تحميل النسخة الاحتياطية بنجاح", 'success');
      return data;
    } catch (err) {
      showToast("فشل تصدير البيانات", 'error');
      throw err;
    }
  };

  const importData = async (file: File) => {
    try {
      await settingsService.importSystemData(file);
      showToast("تم استيراد البيانات بنجاح، سيتم إعادة التحميل", 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return { exportData, importData };
};

export const useBranches = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['branches', user?.company_id],
    queryFn: () => user?.company_id ? settingsService.fetchBranches(user.company_id) : Promise.resolve([]),
    enabled: !!user?.company_id
  });
};

export const useBranchMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const addBranch = useMutation({
    mutationFn: (data: BranchFormData) => {
      if (!user?.company_id) throw new Error('No Company ID');
      return settingsService.addBranch(user.company_id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      showToast('تمت إضافة الفرع الجديد بنجاح', 'success');
    },
    onError: (err: any) => showToast(err.message || 'خطأ في إضافة الفرع', 'error')
  });

  const editBranch = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BranchFormData }) =>
      settingsService.updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      showToast('تم تحديث بيانات الفرع بنجاح', 'success');
    },
    onError: (err: any) => showToast(err.message || 'خطأ في تحديث الفرع', 'error')
  });

  const deleteBranch = useMutation({
    mutationFn: (id: string) => settingsService.removeBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      showToast('تم حذف الفرع', 'info');
    },
    onError: (err: any) => showToast(err.message || 'خطأ في حذف الفرع', 'error')
  });

  return {
    addBranch: addBranch.mutate,
    editBranch: editBranch.mutate,
    deleteBranch: deleteBranch.mutate,
    isAdding: addBranch.isPending,
    isEditing: editBranch.isPending,
    isDeleting: deleteBranch.isPending,
  };
};

export const useInvitations = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['invitations', user?.company_id],
    queryFn: () => user?.company_id ? settingsApi.getInvitations(user.company_id).then(res => res.data || []) : Promise.resolve([]),
    enabled: !!user?.company_id
  });
};

export const useInvitationMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const inviteUser = useMutation({
    mutationFn: (data: { email: string, role: string, branchId?: string | null }) => {
      if (!user?.company_id || !user?.id) throw new Error("Missing Auth");
      return settingsApi.inviteUser(data.email, data.role, user.company_id, user.id, data.branchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      showToast("تم إرسال الدعوة بنجاح", 'success');
    },
    onError: (err: any) => showToast(err.message || 'فشل إرسال الدعوة', 'error')
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => settingsApi.revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      showToast("تم إلغاء الدعوة", 'info');
    },
    onError: (err: any) => showToast(err.message || 'خطأ في إلغاء الدعوة', 'error')
  });

  return {
    inviteUser: inviteUser.mutateAsync,
    revokeInvitation: revokeInvitation.mutate,
    isInviting: inviteUser.isPending,
    isRevoking: revokeInvitation.isPending
  };
};

