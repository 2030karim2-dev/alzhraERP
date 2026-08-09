/**
 * usePartSearch — React hook for Part Number Intelligence.
 * Mirrors useVinAnalysis pattern: invoke edge function, map response, manage state.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type {
  PartSearchResponse,
  PartSearchResultWithInventory,
  PartIdentity,
  PartReference,
} from '../types/models';
import { partSearchEngine } from '../services/PartSearchEngine';
import { fitmentEngine } from '../services/FitmentEngine';

export interface PartSearchState {
  result: PartSearchResultWithInventory | null;
  isSearching: boolean;
  error: string | null;
  part: PartIdentity | null;
  crossReferences: PartReference[];
  inventoryProducts: PartSearchResultWithInventory['inventoryProducts'];
}

export function usePartSearch() {
  const [state, setState] = useState<PartSearchState>({
    result: null, isSearching: false, error: null,
    part: null, crossReferences: [], inventoryProducts: [],
  });
  const abortRef = useRef<AbortController | null>(null);

  const searchPart = useCallback(async (partNumber: string, companyId: string, vin?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, isSearching: true, error: null }));

    try {
      // 1. Search via PartSearchEngine (external + internal providers)
      const searchResult: PartSearchResponse = await partSearchEngine.search({
        partNumber,
        includeCrossReferences: true,
        includeVehicleApplications: true,
        vin,
      });

      if (controller.signal.aborted) return;

      // 2. Check internal inventory for matches
      let inventoryProducts: PartSearchResultWithInventory['inventoryProducts'] = [];
      if (companyId && searchResult.part) {
        try {
          const { data: invData } = await supabase.rpc('search_by_oem', {
            p_company_id: companyId,
            p_search_term: searchResult.part.normalizedNumber,
          });
          inventoryProducts = (invData || []).map((r: any) => ({
            productId: r.product_id,
            sku: r.product_sku || '',
            productName: r.product_name || '',
            productNameAr: r.product_name_ar || undefined,
            quantity: Number(r.stock_quantity) || 0,
            price: Number(r.sale_price) || 0,
            warehouse: undefined,
            location: undefined,
          }));
        } catch { /* inventory lookup is best-effort */ }
      }

      // 3. Fitment assessment if VIN provided
      let fitmentResult = searchResult.fitmentEvidence;
      if (vin && searchResult.part && !fitmentResult) {
        const assessment = fitmentEngine.assess(
          searchResult.part.normalizedNumber,
          vin,
          searchResult.crossReferences,
          searchResult.vehicleApplications.map(a => ({ make: a.make, model: a.model })),
          null,
        );
        if (assessment.status !== 'UNKNOWN') {
          fitmentResult = {
            status: assessment.status,
            evidence: assessment.reasoning.join(' '),
            evidenceSource: 'FITMENT_ENGINE',
            part: searchResult.part,
            vehicle: { make: '', model: '', vin },
            provider: 'INTERNAL_OEM',
            resolvedAt: new Date().toISOString(),
          };
        }
      }

      const resultWithInventory: PartSearchResultWithInventory = {
        ...searchResult,
        fitmentEvidence: fitmentResult,
        inventoryProducts,
      };

      setState({
        result: resultWithInventory,
        isSearching: false,
        error: searchResult.error?.message || null,
        part: searchResult.part,
        crossReferences: searchResult.crossReferences,
        inventoryProducts,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: err instanceof Error ? err.message : 'Part search failed.',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({
      result: null, isSearching: false, error: null,
      part: null, crossReferences: [], inventoryProducts: [],
    });
  }, []);

  return { ...state, searchPart, reset };
}
