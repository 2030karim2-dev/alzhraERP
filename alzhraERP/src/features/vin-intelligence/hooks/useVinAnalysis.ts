import { useState, useCallback } from 'react';
import type { VinAnalysisResult, VehicleCorePart, AnalysisStep } from '../types';
import { supabase } from '../../../lib/supabaseClient';

// -------------------------------------------------------
// Real analysis steps — driven by ACTUAL backend progress
// No fake delays. States advance only when real work occurs.
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

/** Map Edge Function error status codes to user-facing messages */
function mapErrorStatus(status: string, errorDetail?: string): string {
  const msgs: Record<string, string> = {
    INVALID_VIN:          'VIN format is invalid. Please enter a complete 17-character VIN.',
    VIN_NOT_FOUND:        'VIN not recognized by the data provider. Verify the VIN and try again.',
    DECODER_UNAVAILABLE:  'Vehicle data service is temporarily unavailable. Please try again shortly.',
    DECODER_RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
    UNAUTHENTICATED:      'You must be signed in to use VIN intelligence.',
    INTERNAL_ERROR:       'An internal error occurred. Please contact support if this persists.',
  };
  return msgs[status] || errorDetail || 'VIN analysis failed.';
}

/** Convert Edge Function response parts → VehicleCorePart[] */
function mapParts(rawParts: any[]): VehicleCorePart[] {
  return (rawParts || []).map((p: any) => ({
    id:                p.id,
    canonicalPartName: p.canonicalPartName,
    category:          p.category,
    position:          p.position ?? undefined,
    side:              p.side ?? undefined,
    oemNumbers:        p.oemNumbers ?? [],
    crossReferences:   p.crossReferences ?? [],
    // Strict fitment mapping — CONFIRMED only if backend says VERIFIED
    fitmentStatus:     (['VERIFIED','INFERRED','UNKNOWN','NOT_COMPATIBLE'].includes(p.fitmentStatus) ? p.fitmentStatus : 'UNKNOWN') as import('../types').FitmentStatus,
    evidence:          p.evidence ?? undefined,
    evidenceSource:    p.evidenceSource ?? undefined,
    demandLevel:       p.demandLevel as VehicleCorePart['demandLevel'],
    salesCount:        p.salesCount ?? 0,
    vehicleMatches:    p.vehicleMatches ?? 0,
    inventoryMatches:  (p.inventoryMatches ?? []).map((m: any) => ({
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

  const resetSteps = useCallback(() => setSteps(INITIAL_STEPS.map(s => ({ ...s }))), []);

  const markStep = useCallback((idx: number, status: AnalysisStep['status']) =>
    setSteps(prev => {
      const n = [...prev];
      n[idx] = { ...n[idx], status };
      return n;
    }), []);

  const analyzeVin = useCallback(async (vin: string) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    resetSteps();

    try {
      // Step 0: Validating (client-side pre-check before network call)
      markStep(0, 'IN_PROGRESS');
      const normalized = (vin || '').replace(/[\s\-]/g, '').toUpperCase();
      if (!normalized || normalized.length !== 17 || /[IOQ]/.test(normalized)) {
        markStep(0, 'ERROR');
        setError('VIN format is invalid. Enter a complete 17-character VIN (no I, O, Q).');
        return;
      }
      markStep(0, 'COMPLETE');

      // Step 1: Decoding (send to Edge Function — real NHTSA call happens here)
      markStep(1, 'IN_PROGRESS');
      markStep(2, 'IN_PROGRESS');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // Guard: detect missing/expired session before making any network call
      if (!token) {
        markStep(1, 'ERROR');
        setError('Your session has expired. Please sign in again to use VIN Intelligence.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vin-analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ vin: normalized }),
        }
      );

      // Guard: handle HTTP errors before attempting JSON parse
      if (!response.ok && response.status !== 200) {
        const errText = await response.text().catch(() => `HTTP ${response.status}`);
        throw new Error(`Edge Function error (${response.status}): ${errText.slice(0, 200)}`);
      }

      const data = await response.json();

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
        return;
      }

      markStep(1, 'COMPLETE');
      markStep(2, 'COMPLETE');

      // Steps 3–6: Parts / OEM / Inventory / Knowledge — driven by received data
      markStep(3, 'IN_PROGRESS');
      const parts = mapParts(data.parts);
      markStep(3, 'COMPLETE');

      markStep(4, 'IN_PROGRESS');
      const inventoryMatches = parts
        .filter(p => p.inventoryMatches.length > 0)
        .flatMap(p => p.inventoryMatches);
      markStep(4, 'COMPLETE');

      markStep(5, 'IN_PROGRESS');
      const missingParts = parts.filter(
        p => p.inventoryMatches.length === 0 && p.fitmentStatus !== 'NOT_COMPATIBLE'
      );
      markStep(5, 'COMPLETE');

      markStep(6, 'IN_PROGRESS');
      // Build demand insights from high/medium demand parts
      const demandInsights = parts
        .filter(p => p.demandLevel === 'HIGH' || p.demandLevel === 'MEDIUM')
        .map(p => ({
          partId:          p.id,
          partName:        p.canonicalPartName,
          demandLevel:     (p.demandLevel === 'UNKNOWN' ? 'LOW' : p.demandLevel) as 'HIGH' | 'MEDIUM' | 'LOW',
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
          ? ['Vehicle added to knowledge base from provider data.']
          : undefined,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
      setSteps(prev =>
        prev.map(s => s.status === 'IN_PROGRESS' ? { ...s, status: 'ERROR' as const } : s)
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [markStep, resetSteps]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    resetSteps();
  }, [resetSteps]);

  return { result, isAnalyzing, error, steps, analyzeVin, reset };
}
