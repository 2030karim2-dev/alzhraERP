import { supabase } from '../../../lib/supabaseClient';
import { partIntelligenceService } from '../../vin-intelligence/services/partIntelligenceService';
import { logger } from '../../../core/utils/logger';

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
   * Search for alternative part numbers using multi-source intelligence:
   * 1. Scrapes auto parts websites via `ai-part-lookup` Edge Function
   * 2. Queries live catalogs and compatibility graph via `partIntelligenceService`
   * 3. Merges and deduplicates real OEM and aftermarket cross-references
   */
  async lookupPartNumber(partNumber: string, brand?: string | null): Promise<AIPartLookupResult> {
    const cleanPN = partNumber.trim().toUpperCase();
    if (!cleanPN) {
      throw new Error('يرجى تحديد رقم القطعة للبحث');
    }

    const normTarget = cleanPN.replace(/[\s\-.]/g, '');
    const altsMap = new Map<string, AIAlternative>();
    const sourceSites = new Set<string>();
    let imageUrl: string | null = null;
    const debugList: AISiteDebug[] = [];

    // 1. Try ai-part-lookup Edge function (web scraper)
    try {
      const response = await supabase.functions.invoke('ai-part-lookup', {
        body: { part_number: cleanPN, brand: brand || undefined },
      });

      if (response.data) {
        const data = response.data as AIPartLookupResult;
        if (data.image_url) imageUrl = data.image_url;
        if (Array.isArray(data.source_sites)) {
          data.source_sites.forEach(s => sourceSites.add(s));
        }
        if (Array.isArray(data.debug)) {
          debugList.push(...data.debug);
        }
        if (Array.isArray(data.alternatives)) {
          for (const alt of data.alternatives) {
            const norm = alt.part_number.replace(/[\s\-.]/g, '').toUpperCase();
            if (norm && norm !== normTarget) {
              altsMap.set(norm, alt);
            }
          }
        }
      }
    } catch (err) {
      logger.warn('AIPartLookup', 'ai-part-lookup edge function invoke failed', err);
    }

    // 2. Query partIntelligenceService (MegaZip, PartSouq, DB graph, patterns)
    try {
      const intelResult = await partIntelligenceService.inspectPart(cleanPN);
      if (intelResult.imageUrl && !imageUrl) {
        imageUrl = intelResult.imageUrl;
      }
      if (intelResult.source) {
        sourceSites.add(intelResult.source);
      }

      if (Array.isArray(intelResult.alternatives)) {
        for (const alt of intelResult.alternatives) {
          const norm = alt.partNumber.replace(/[\s\-.]/g, '').toUpperCase();
          if (norm && norm !== normTarget && !altsMap.has(norm)) {
            altsMap.set(norm, {
              part_number: alt.partNumber,
              sources: [alt.source || alt.brand || 'Catalog'],
              method: alt.type === 'OEM' ? 'xref' : 'data',
              confidence: alt.confidence || 'high',
            });
            if (alt.source) sourceSites.add(alt.source);
          }
        }
      }
    } catch (err) {
      logger.warn('AIPartLookup', 'partIntelligenceService fallback failed', err);
    }

    const finalAlternatives = Array.from(altsMap.values());
    const finalSources = Array.from(sourceSites);

    return {
      alternatives: finalAlternatives,
      image_url: imageUrl,
      source_sites: finalSources.length > 0 ? finalSources : ['catalogs'],
      cached: false,
      part_number: cleanPN,
      debug: debugList,
    };
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
      alternatives: (data.alternatives ?? []) as unknown as AIAlternative[],
      image_url: data.image_url,
      source_sites: data.source_sites ?? [],
      cached: true,
      part_number: cleanPN,
    };
  },
};
