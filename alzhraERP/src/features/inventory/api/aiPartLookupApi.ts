import { supabase } from '../../../lib/supabaseClient';

export interface AIAlternative {
    part_number: string;
    sources: string[];
    method: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface AISiteDebug {
    site: string;
    ok: boolean;
    parts: number;
    ms: number;
}

export interface AIPartLookupResult {
    alternatives: AIAlternative[];
    image_url: string | null;
    source_sites: string[];
    failed_sites?: string[];
    cached: boolean;
    part_number: string;
    debug?: AISiteDebug[];
}

export const aiPartLookupApi = {
    /**
     * Search for alternative part numbers using the AI Edge Function.
     * Scrapes real auto parts websites for genuine cross-references.
     */
    async lookupPartNumber(partNumber: string, brand?: string | null | undefined): Promise<AIPartLookupResult> {
        const response = await supabase.functions.invoke('ai-part-lookup', {
            body: { part_number: partNumber, brand: brand || undefined },
        });

        if (response.error) {
            throw new Error(response.error.message || 'فشل البحث عن الأرقام البديلة');
        }

        return response.data as AIPartLookupResult;
    },

    /**
     * Get cached results for a part number (no external call).
     */
    async getCachedResults(partNumber: string): Promise<AIPartLookupResult | null> {
        const cleanPN = partNumber.trim().toUpperCase();
        const { data } = await supabase
            .from('ai_part_lookup_cache')
            .select('*')
            .eq('part_number', cleanPN)
            .gt('expires_at', new Date().toISOString())
            .limit(1)
            .maybeSingle();

        if (!data) return null;

        return {
            alternatives: data.alternatives || [],
            image_url: data.image_url,
            source_sites: data.source_sites || [],
            cached: true,
            part_number: cleanPN,
        };
    },
};
