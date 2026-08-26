import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFeedbackStore } from '../../feedback/store';
import { vinService } from '../services/vinService';
import type {
  ExtractedPart,
  VehicleInfo,
  VehicleProductLink,
  VinDecodeMode,
  VinDecodeResult,
} from '../types';

/**
 * useVinIntelligence — single orchestration hook for the VIN page.
 * Internal Graph is the source of truth; AI/FAPI are enrichment.
 */
export function useVinIntelligence(companyId?: string, userId?: string) {
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();

  const [result, setResult] = useState<VinDecodeResult | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const vehicle = result?.vehicle ?? null;

  const decodeVin = useCallback(
    async (vin: string, mode: VinDecodeMode = 'hybrid') => {
      setIsDecoding(true);
      setDecodeError(null);
      try {
        const res = await vinService.decodeVin(vin, mode);
        setResult(res);
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل فك الشاصي';
        setDecodeError(msg);
        throw err;
      } finally {
        setIsDecoding(false);
      }
    },
    [companyId, userId],
  );

  const setManualVehicle = useCallback(
    async (manualVehicle: VehicleInfo, vinNumber?: string) => {
      setIsDecoding(true);
      setDecodeError(null);
      try {
        let vehicleId = manualVehicle.id;
        if (!vehicleId && manualVehicle.make) {
          vehicleId = (await vinService.ensureVehicle(manualVehicle)) || undefined;
        }
        const updatedVehicle: VehicleInfo = {
          ...manualVehicle,
          ...(vehicleId ? { id: vehicleId } : {}),
        };
        const vinVal = (vinNumber && vinNumber.trim()) || `MANUAL-${Date.now().toString(36).toUpperCase()}`;
        const manualResult: VinDecodeResult = {
          vin: vinVal,
          found: true,
          source: 'manual',
          vehicle: updatedVehicle,
          confidence: 'high',
        };
        setResult(manualResult);
        showToast('تم تعيين بيانات السيارة بنجاح', 'success');
        return manualResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل تعيين بيانات السيارة';
        setDecodeError(msg);
        showToast('فشل تعيين بيانات السيارة', 'error', err);
        throw err;
      } finally {
        setIsDecoding(false);
      }
    },
    [showToast]
  );

  const saveManualVehicle = useCallback(
    async (manualVehicle: VehicleInfo, vinNumber?: string) => {
      if (!companyId || !userId) {
        showToast('الرجاء تسجيل الدخول أولاً', 'error');
        return null;
      }
      try {
        const manualRes = await setManualVehicle(manualVehicle, vinNumber);
        if (manualRes) {
          await vinService.saveAnalysis(companyId, userId, manualRes);
          queryClient.invalidateQueries({ queryKey: ['vin', 'history'] });
          showToast('تم حفظ وإضافة المركبة بنجاح ✨', 'success');
          return manualRes;
        }
        return null;
      } catch (err) {
        showToast('فشل حفظ المركبة', 'error', err);
        throw err;
      }
    },
    [companyId, userId, setManualVehicle, queryClient, showToast]
  );

  const matchingQuery = useQuery({
    queryKey: ['vin', 'matching', companyId, vehicle?.make, vehicle?.model, vehicle?.year ?? vehicle?.yearStart],
    queryFn: () =>
      companyId && vehicle ? vinService.matchInventory(companyId, vehicle) : Promise.resolve([]),
    enabled: !!companyId && !!vehicle,
    staleTime: 60_000,
  });

  const linkedQuery = useQuery({
    queryKey: ['vin', 'linked', vehicle?.id],
    queryFn: () => (vehicle?.id ? vinService.listLinkedProducts(vehicle.id) : Promise.resolve([])),
    enabled: !!vehicle?.id,
  });

  const historyQuery = useQuery({
    queryKey: ['vin', 'history', companyId],
    queryFn: () => (companyId ? vinService.listAnalyses(companyId) : Promise.resolve([])),
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !userId || !result?.vehicle) return false;
      await vinService.saveAnalysis(companyId, userId, result);
      return true;
    },
    onSuccess: () => {
      showToast('تم حفظ الشاصي بنجاح', 'success');
      queryClient.invalidateQueries({ queryKey: ['vin', 'history'] });
    },
    onError: (err) => showToast('فشل الحفظ', 'error', err),
  });

  const searchMutation = useMutation({
    mutationFn: (partNumber: string) => vinService.searchPartByNumber(partNumber),
    onError: (err) => showToast('فشل البحث', 'error', err),
  });

  const addMutation = useMutation({
    mutationFn: ({ vehicle: target, parts }: { vehicle: VehicleInfo; parts: ExtractedPart[] }) => {
      if (!companyId || !userId) return Promise.resolve({ added: 0, existing: 0 });
      return vinService.addPartsToInventory({ companyId, userId, vehicle: target, parts });
    },
    onSuccess: (result) => {
      const { added, existing } = result;
      if (added > 0 && existing > 0) {
        showToast(`تمت إضافة ${added} قطعة، و${existing} كانت موجودة مسبقاً`, 'success');
      } else if (added > 0) {
        showToast(`تمت إضافة ${added} قطعة إلى المخزون`, 'success');
      } else if (existing > 0) {
        showToast(`كل القطع (${existing}) موجودة مسبقاً في المخزون`, 'info');
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['vin', 'matching'] });
      queryClient.invalidateQueries({ queryKey: ['vin', 'linked'] });
    },
    onError: (err) => showToast('فشل الإضافة', 'error', err),
  });

  const linkMutation = useMutation({
    mutationFn: ({ productId }: { productId: string }) => {
      if (!companyId || !userId || !vehicle?.id) return Promise.resolve();
      return vinService.linkProduct(companyId, userId, vehicle.id, productId, 'POSSIBLE');
    },
    onSuccess: () => {
      showToast('تم ربط المنتج بالمركبة', 'success');
      queryClient.invalidateQueries({ queryKey: ['vin', 'linked'] });
    },
    onError: (err) => showToast('فشل الربط', 'error', err),
  });

  const unlinkMutation = useMutation({
    mutationFn: (id: string) => vinService.unlinkProduct(id),
    onSuccess: () => {
      showToast('تم إلغاء الربط', 'info');
      queryClient.invalidateQueries({ queryKey: ['vin', 'linked'] });
    },
    onError: (err) => showToast('فشل إلغاء الربط', 'error', err),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vinService.deleteAnalysis(id),
    onSuccess: () => {
      showToast('تم حذف الشاصي من السجل بنجاح 🗑️', 'success');
      queryClient.invalidateQueries({ queryKey: ['vin', 'history'] });
    },
    onError: (err) => showToast('فشل حذف الشاصي', 'error', err),
  });

  const loadLinkedProducts = useCallback(
    (vehicleId: string): Promise<VehicleProductLink[]> => vinService.listLinkedProducts(vehicleId),
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setDecodeError(null);
  }, []);

  /** Backward-compatible wrapper: returns total count (added + existing) so the
   * legacy `Promise<number>` shape keeps working in PartsExtractTab / VinsTab.
   * Toast feedback still surfaces the breakdown accurately. */
  const addToInventory = useCallback(
    (args: { vehicle: VehicleInfo; parts: ExtractedPart[] }): Promise<number> =>
      addMutation
        .mutateAsync(args)
        .then((res) => (res.added ?? 0) + (res.existing ?? 0)),
    [addMutation],
  );

  return {
    result,
    vehicle,
    isDecoding,
    decodeError,
    decodeVin,
    setManualVehicle,
    saveManualVehicle,
    reset,
    matchingProducts: matchingQuery.data ?? [],
    isMatching: matchingQuery.isLoading,
    linkedProducts: linkedQuery.data ?? [],
    isLinkedLoading: linkedQuery.isLoading,
    savedVins: historyQuery.data ?? [],
    isSavedVinsLoading: historyQuery.isLoading,
    saveCurrentResult: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteSavedVin: deleteMutation.mutateAsync,
    isDeletingVin: deleteMutation.isPending,
    loadLinkedProducts,
    searchPartByNumber: searchMutation.mutateAsync,
    isSearching: searchMutation.isPending,
    addToInventory,
    isAdding: addMutation.isPending,
    linkProduct: linkMutation.mutateAsync,
    isLinking: linkMutation.isPending,
    unlinkProduct: unlinkMutation.mutateAsync,
  };
}
