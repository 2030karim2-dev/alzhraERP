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

  const matchingQuery = useQuery({
    queryKey: ['vin', 'matching', companyId, vehicle?.make, vehicle?.model, vehicle?.year],
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
      if (!companyId || !userId) return Promise.resolve(0);
      return vinService.addPartsToInventory({ companyId, userId, vehicle: target, parts });
    },
    onSuccess: (count) => {
      showToast(`تمت إضافة ${count} قطعة إلى المخزون`, 'success');
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

  const loadLinkedProducts = useCallback(
    (vehicleId: string): Promise<VehicleProductLink[]> => vinService.listLinkedProducts(vehicleId),
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setDecodeError(null);
  }, []);

  return {
    result,
    vehicle,
    isDecoding,
    decodeError,
    decodeVin,
    reset,
    matchingProducts: matchingQuery.data ?? [],
    isMatching: matchingQuery.isLoading,
    linkedProducts: linkedQuery.data ?? [],
    isLinkedLoading: linkedQuery.isLoading,
    savedVins: historyQuery.data ?? [],
    isSavedVinsLoading: historyQuery.isLoading,
    saveCurrentResult: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    loadLinkedProducts,
    searchPartByNumber: searchMutation.mutateAsync,
    isSearching: searchMutation.isPending,
    addToInventory: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    linkProduct: linkMutation.mutateAsync,
    isLinking: linkMutation.isPending,
    unlinkProduct: unlinkMutation.mutateAsync,
  };
}
