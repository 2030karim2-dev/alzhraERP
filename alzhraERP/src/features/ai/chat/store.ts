/**
 * AI Module - Chat Store (Zustand)
 * Manages AI prefill data and product lookup state.
 */
import { create } from 'zustand';
import { AIParsedResponse, AIIntent, LookupResult } from '../core/types';

interface AIStoreState {
    pendingPrefill: AIParsedResponse | null;
    productLookupResults: LookupResult[] | null;
    productLookupAction: AIParsedResponse | null;
    setPendingPrefill: (action: AIParsedResponse | null) => void;
    setProductLookup: (results: LookupResult[], action: AIParsedResponse) => void;
    clearProductLookup: () => void;
    consumePrefill: (intentPattern: AIIntent | string | string[]) => AIParsedResponse | null;
}

export const useAIPrefillStore = create<AIStoreState>((set, get) => ({
    pendingPrefill: null,
    productLookupResults: null,
    productLookupAction: null,
    setPendingPrefill: (action) => set({ pendingPrefill: action }),
    setProductLookup: (results, action) => set({ productLookupResults: results, productLookupAction: action }),
    clearProductLookup: () => set({ productLookupResults: null, productLookupAction: null }),
    consumePrefill: (intentPattern) => {
        const { pendingPrefill } = get();
        if (!pendingPrefill) return null;
        
        const intents = Array.isArray(intentPattern) ? intentPattern : [intentPattern];
        if (intents.includes(pendingPrefill.intent)) {
            set({ pendingPrefill: null });
            return pendingPrefill;
        }
        return null;
    }
}));
