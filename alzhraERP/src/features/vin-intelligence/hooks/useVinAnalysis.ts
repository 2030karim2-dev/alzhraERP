import { useState, useCallback, useRef, useEffect } from 'react';
import type { VinAnalysisResult, VehicleCorePart, AnalysisStep } from '../types';
import { supabase } from '../../../lib/supabaseClient';

// -------------------------------------------------------
// Analysis steps — driven by backend progress + sequenced UI updates
// -------------------------------------------------------
const INITIAL_STEPS: AnalysisStep[] = [
  { id: 'validate',   label: 'vin_validating',        status: 'PENDING' },
  { id: 'decode',     label: 'vin_identifying',        status: 'PENDING' },
  { id: 'vehicle',    label: 'vin_config',             status: 'PENDING' },
  { id: 'parts',      label: 'vin_finding_parts',      status: 'PENDING' },
  { id: 'oem',        label: 'vin_matching_oem',       status: 'PENDING' },
  { id: 'inventory',  label: 'vin_matching_inv',       status: 'PENDING' },
  { id: 'knowledge',  label: 'vin_building_knowledge', status: 'PENDING' },
];

/** Yield to the browser so React can flush a render before continuing */
const yieldToUI = () => new Promise<void>(r => requestAnimationFrame(() => r()));

/** Map Edge Function error status codes to user-facing messages */
function mapErrorStatus(status: string, errorDetail?: string): string {
  const msgs: Record<string, string> = {
    INVALID_VIN:          'رقم الشاصي غير صالح. يرجى إدخال رقم شاصي كامل مكون من 17 حرفاً.',
    VIN_NOT_FOUND:        'لم يتم التعرف على رقم الشاصي. تحقق من الرقم وحاول مرة أخرى.',
    DECODER_UNAVAILABLE:  'خدمة بيانات المركبات غير متاحة حالياً. يرجى المحاولة لاحقاً.',
    DECODER_RATE_LIMITED: 'طلبات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة مرة أخرى.',
    UNAUTHENTICATED:      'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى لاستخدام ذكاء VIN.',
    INTERNAL_ERROR:       'حدث خطأ داخلي. يرجى التواصل مع الدعم الفني إذا استمرت المشكلة.',
  };
  return msgs[status] || errorDetail || 'فشل تحليل رقم الشاصي.';
}

/** Raw part data shape from vin-analyze Edge Function */
interface RawVinPart {
    id: string;
    canonicalPartName: string;
    category: string;
    position?: string | null;
    side?: string | null;
    oemNumbers?: string[];
    crossReferences?: string[];
    fitmentStatus?: string;
    evidence?: string | null;
    evidenceSource?: string | null;
    demandLevel?: string;
    salesCount?: number;
    vehicleMatches?: number;
    inventoryMatches?: RawInventoryMatch[];
}

interface RawInventoryMatch {
    productId: string;
    sku?: string;
    productName?: string;
    productNameAr?: string;
    quantity?: number;
    price?: number | null;
    warehouse?: string | null;
    location?: string | null;
}

/** Convert Edge Function response parts → VehicleCorePart[] */
function mapParts(rawParts: RawVinPart[]): VehicleCorePart[] {
  return (rawParts || []).map((p: RawVinPart) => ({
    id:                p.id,
    canonicalPartName: p.canonicalPartName,
    category:          p.category,
    position:          p.position ?? undefined,
    side:              p.side ?? undefined,
    oemNumbers:        p.oemNumbers ?? [],
    crossReferences:   p.crossReferences ?? [],
    fitmentStatus:     (['VERIFIED','INFERRED','UNKNOWN','NOT_COMPATIBLE'].includes(p.fitmentStatus || '') ? p.fitmentStatus : 'UNKNOWN') as import('../types').FitmentStatus,
    evidence:          p.evidence ?? undefined,
    evidenceSource:    p.evidenceSource ?? undefined,
    demandLevel:       p.demandLevel as VehicleCorePart['demandLevel'],
    salesCount:        p.salesCount ?? 0,
    vehicleMatches:    p.vehicleMatches ?? 0,
    inventoryMatches:  (p.inventoryMatches ?? []).map((m: RawInventoryMatch) => ({
      productId:    m.productId,
      sku:          m.sku,
      productName:  m.productName,
      productNameAr: m.productNameAr,
      quantity:     m.quantity ?? 0,
      price:        m.price ?? undefined,
      warehouse:    m.warehouse ?? undefined,
      location:     m.location ?? undefined,
    })),
  }));
}

interface UseVinAnalysisReturn {
  result: VinAnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  steps: AnalysisStep[];
  analyzeVin: (vin: string) => Promise<void>;
  reset: () => void;
}

export function useVinAnalysis(): UseVinAnalysisReturn {
  const [result, setResult] = useState<VinAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>(INITIAL_STEPS.map(s => ({ ...s })));
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup: abort any in-flight request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const resetSteps = useCallback(() => setSteps(INITIAL_STEPS.map(s => ({ ...s }))), []);

  const markStep = useCallback((idx: number, status: AnalysisStep['status']) =>
    setSteps(prev => {
      const n = [...prev];
      n[idx] = { ...n[idx], status };
      return n;
    }), []);

  const analyzeVin = useCallback(async (vin: string) => {
    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    resetSteps();

    try {
      // Step 0: Validating (client-side pre-check before network call)
      markStep(0, 'IN_PROGRESS');
      const normalized = (vin || '').replace(/[\s\-]/g, '').toUpperCase();
      // Accept VINs of 11-17 characters (backend handles 11, 12, 13, 17)
      const validLengths = [11, 12, 13, 17];
      if (!normalized || !validLengths.includes(normalized.length) || /[IOQ]/.test(normalized)) {
        markStep(0, 'ERROR');
        setError('رقم الشاصي غير صالح. أدخل رقماً صحيحاً (11، 12، 13، أو 17 حرفاً، بدون I, O, Q).');
        setIsAnalyzing(false);
        return;
      }
      markStep(0, 'COMPLETE');

      // Step 1: Decoding (send to Edge Function — real NHTSA call happens here)
      markStep(1, 'IN_PROGRESS');
      markStep(2, 'IN_PROGRESS');

      const { data, error: fnError } = await supabase.functions.invoke('vin-analyze', {
        body: { vin: normalized },
        signal: controller.signal,
      });

      // Guard: handle invoke errors (network, auth, function not found, etc.)
      if (fnError) {
        markStep(1, 'ERROR');
        markStep(2, 'ERROR');
        setSteps(prev => prev.map(s =>
          s.status === 'IN_PROGRESS' ? { ...s, status: 'ERROR' as const } : s
        ));

        // Diagnose error type for better user messaging
        const errName = (fnError as any)?.name || '';
        const errMsg = (fnError as any)?.message || '';
        const errStatus = (fnError as any)?.context?.status;

        if (errName === 'FunctionsFetchError' && errMsg.includes('Failed to send')) {
          setError('تعذر الاتصال بخدمة التحليل. قد لا تكون دالة Edge منشورة أو Supabase غير قابل للوصول. تحقق من اتصال الشبكة.');
        } else if (errStatus === 401 || errMsg.includes('Unauthorized') || errMsg.includes('UNAUTHENTICATED')) {
          setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى لاستخدام ذكاء VIN.');
        } else if (errStatus === 404) {
          setError('خدمة تحليل VIN غير موجودة (404). يجب نشر دالة vin-analyze.');
        } else {
          const msg = errMsg || `خطأ في دالة Edge: ${(fnError as any)?.code || 'غير معروف'}`;
          setError(msg);
        }
        setIsAnalyzing(false);
        return;
      }

      // Step 1 & 2: Decoder + Vehicle
      if (data.status !== 'SUCCESS' || !data.vehicle) {
        markStep(1, 'ERROR');
        markStep(2, 'ERROR');
        setSteps(prev => prev.map(s =>
          s.status === 'IN_PROGRESS' ? { ...s, status: 'ERROR' as const } : s
        ));
        setError(mapErrorStatus(data.status, data.errorDetail));
        // Still set a FAILED result so VINPage renders the correct error card
        setResult({
          vin: normalized,
          vehicle: { vin: normalized, make: '', model: '' },
          coreParts: [],
          inventoryMatches: [],
          missingParts: [],
          demandInsights: [],
          analysisTimestamp: new Date().toISOString(),
          analysisStatus: 'FAILED',
          warnings: [mapErrorStatus(data.status, data.errorDetail)],
        });
        setIsAnalyzing(false);
        return;
      }

      markStep(1, 'COMPLETE');
      markStep(2, 'COMPLETE');

      // Steps 3–6: sequenced with yieldToUI for visual progress
      markStep(3, 'IN_PROGRESS'); await yieldToUI();
      const parts = mapParts(data.parts);
      markStep(3, 'COMPLETE'); await yieldToUI();

      markStep(4, 'IN_PROGRESS'); await yieldToUI();
      const inventoryMatches = parts
        .filter(p => p.inventoryMatches.length > 0)
        .flatMap(p => p.inventoryMatches);
      markStep(4, 'COMPLETE'); await yieldToUI();

      markStep(5, 'IN_PROGRESS'); await yieldToUI();
      const missingParts = parts.filter(
        p => p.inventoryMatches.length === 0 && p.fitmentStatus !== 'NOT_COMPATIBLE'
      );
      markStep(5, 'COMPLETE'); await yieldToUI();

      markStep(6, 'IN_PROGRESS'); await yieldToUI();
      // Build demand insights from high/medium demand parts
      const demandInsights = parts
        .filter(p => p.demandLevel === 'HIGH' || p.demandLevel === 'MEDIUM')
        .map(p => ({
          partId:          p.id,
          partName:        p.canonicalPartName,
          demandLevel:     p.demandLevel as 'HIGH' | 'MEDIUM' | 'LOW',
          salesCount:      p.salesCount ?? 0,
          vehicleMatches:  p.vehicleMatches ?? 0,
          isCorePart:      true,
          isFastMoving:    (p.salesCount ?? 0) > 300,
          recommendedStock: undefined,
        }));
      markStep(6, 'COMPLETE');

      const v = data.vehicle;
      setResult({
        vin: data.vin,
        vehicle: {
          vin:          v.vin,
          make:         v.make,
          model:        v.model,
          year:         v.year,
          engineSize:   v.engineSize ?? undefined,
          cylinderCount: v.cylinderCount ?? undefined,
          fuelType:     v.fuelType ?? undefined,
          transmission: v.transmission ?? undefined,
          driveType:    v.driveType ?? undefined,
          bodyType:     v.bodyType ?? undefined,
          market:       v.market ?? undefined,
        },
        coreParts: parts,
        inventoryMatches,
        missingParts,
        demandInsights,
        analysisTimestamp: new Date().toISOString(),
        analysisStatus: 'COMPLETE',
        warnings: data.meta?.vehicleIsNew
          ? ['تمت إضافة المركبة إلى قاعدة المعرفة من بيانات المزوّد.']
          : undefined,
      });

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Analysis failed';

      // Detect specific error scenarios
      const errMsgLower = msg.toLowerCase();
      if (errMsgLower.includes('failed to fetch') || errMsgLower.includes('network') || errMsgLower.includes('timeout')) {
        setError('خطأ في الشبكة: تعذر الاتصال بخدمة التحليل. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
      } else if (errMsgLower.includes('failed to send')) {
        setError('تعذر الاتصال بخدمة تحليل VIN. قد تحتاج دالة Edge (vin-analyze) إلى النشر.');
      } else {
        setError(msg);
      }
      setSteps(prev =>
        prev.map(s => s.status === 'IN_PROGRESS' ? { ...s, status: 'ERROR' as const } : s)
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [markStep, resetSteps]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResult(null);
    setError(null);
    resetSteps();
  }, [resetSteps]);

  return { result, isAnalyzing, error, steps, analyzeVin, reset };
}
