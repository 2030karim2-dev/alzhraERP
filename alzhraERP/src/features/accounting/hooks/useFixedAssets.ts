import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { fixedAssetService, type CreateFixedAssetInput } from '../services/fixedAssetService';
import { assertPermission } from '../../../core/hooks/usePermission';

export const useFixedAssets = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['fixed_assets', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      return await fixedAssetService.getAssets(user.company_id);
    },
    enabled: !!user?.company_id,
  });
};

export const useFixedAssetMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const createAsset = useMutation({
    mutationFn: async (input: CreateFixedAssetInput) => {
      if (!user?.company_id) throw new Error('No Company ID');
      await assertPermission('accounting:create', 'تسجيل أصول ثابتة');
      return fixedAssetService.createAsset(user.company_id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_assets'] });
      showToast('تم تسجيل الأصل الثابت بنجاح', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  const postSingleDepreciation = useMutation({
    mutationFn: async ({ assetId, periodDate }: { assetId: string; periodDate?: string }) => {
      await assertPermission('accounting:create', 'ترحيل إهلاك الأصول');
      return fixedAssetService.postAssetDepreciation(assetId, periodDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_assets'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['trial_balance'] });
      showToast('تم احتساب وإثبات قيد إهلاك الأصل بنجاح', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  const runAllDepreciation = useMutation({
    mutationFn: async (periodDate?: string | void) => {
      if (!user?.company_id) throw new Error('No Company ID');
      await assertPermission('accounting:create', 'تشغيل الإهلاك الدوري');
      return fixedAssetService.runAllAssetsDepreciation(user.company_id, periodDate || undefined);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['fixed_assets'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['trial_balance'] });
      showToast(
        `تم تشغيل الإهلاك الدوري بنجاح لـ ${data?.assets_processed ?? 0} أصل بإجمالي ${data?.total_amount ?? 0} ر.س`,
        'success'
      );
      // تحذير المستخدم إذا كانت هناك أصول فشل إهلاكها (logs individual errors from DB)
      if (data?.error_count > 0) {
        const assetNames = (data.errors as Array<{ asset_code: string; reason: string }>)
          .map(e => `${e.asset_code}: ${e.reason}`)
          .join(' ، ');
        showToast(`تعذّر إهلاك ${data.error_count} أصل: ${assetNames}`, 'warning');
      }
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  return {
    createAsset: createAsset.mutateAsync,
    isCreating: createAsset.isPending,
    postSingleDepreciation: postSingleDepreciation.mutateAsync,
    isDepreciatingSingle: postSingleDepreciation.isPending,
    runAllDepreciation: runAllDepreciation.mutateAsync,
    isRunningAll: runAllDepreciation.isPending,
  };
};
