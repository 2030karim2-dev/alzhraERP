/**
 * usePartInspection.ts
 * Shared state + logic for the "deep part inspection" flow used by both
 * VinsTab and PartsExtractTab. Centralising the modal state (open/loading/
 * result) and the inspection handler removes two identical ~30-line copies.
 */
import { useState, useCallback } from 'react';
import { partIntelligenceService } from '../services/partIntelligenceService';
import { useFeedbackStore } from '../../feedback/store';
import type { PartIntelligenceResult, VehicleInfo } from '../types';

export interface UsePartInspectionResult {
  isIntelligenceOpen: boolean;
  setIsIntelligenceOpen: (open: boolean) => void;
  isIntelligenceLoading: boolean;
  activeIntelligence: PartIntelligenceResult | null;
  /**
   * Opens the inspection modal and resolves deep intelligence for `partNum`.
   * Failures are surfaced via toast and swallowed (modal stays open).
   */
  handleDeepInspectPart: (
    partNum: string,
    vehicle: VehicleInfo | null,
    selectedCatalogId?: string
  ) => Promise<void>;
}

export const usePartInspection = (): UsePartInspectionResult => {
  const { showToast } = useFeedbackStore();
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);
  const [activeIntelligence, setActiveIntelligence] = useState<PartIntelligenceResult | null>(null);

  const handleDeepInspectPart = useCallback(
    async (partNum: string, vehicle: VehicleInfo | null, selectedCatalogId = 'megazip') => {
      const q = partNum.trim().toUpperCase();
      if (!q || q.length < 3) return;
      setIsIntelligenceOpen(true);
      setIsIntelligenceLoading(true);
      try {
        const intel = await partIntelligenceService.inspectPart(q, vehicle, selectedCatalogId);
        setActiveIntelligence(intel);
      } catch (err) {
        showToast('تعذر فحص تفاصيل القطعة، يرجى المحاولة لاحقاً', 'error', err);
      } finally {
        setIsIntelligenceLoading(false);
      }
    },
    [showToast]
  );

  return {
    isIntelligenceOpen,
    setIsIntelligenceOpen,
    isIntelligenceLoading,
    activeIntelligence,
    handleDeepInspectPart,
  };
};
