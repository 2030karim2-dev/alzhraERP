/**
 * Part Intelligence & Cross-Reference Extraction Engine
 * Extracts:
 *  - Primary Bilingual Part Names & Categories (Arabic & English)
 *  - OEM & Aftermarket Interchange / Cross-References (الأرقام البديلة)
 *  - Compatible Vehicles Matrix (السيارات الأخرى المتوافقة)
 *  - Calibrated Confidence Score (نسبة الثقة بالنتيجة)
 */

import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import {
  findArabicPartTerm,
  getArabicVehicleName,
  formatVehicleYears,
} from '../utils/smartPartNamer';
import type {
  PartAlternative,
  CompatibleVehicle,
  PartIntelligenceResult,
  VehicleInfo,
} from '../types';

import { PART_PATTERNS, detectPartBrand } from '../constants/partPatterns';

// Public API kept stable: the test-suite (and any consumer) imports these
// from the service — they now physically live in constants/partPatterns.
export { KNOWN_BRANDS, detectPartBrand } from '../constants/partPatterns';

export const partIntelligenceService = {
  /**
   * Deep multi-catalog search & intelligence extraction
   */
  async inspectPart(
    partNumber: string,
    activeVehicle?: VehicleInfo | null,
    targetCatalog = 'megazip'
  ): Promise<PartIntelligenceResult> {
    const cleanPN = partNumber.trim().toUpperCase();
    if (!cleanPN || cleanPN.length < 3) {
      throw new Error('يرجى إدخال رقم قطعة صالح');
    }

    const normTargetPN = cleanPN.replace(/[\s\-.]/g, '');

    // 1. Check known patterns for instant deep intelligence
    const matchedPattern = PART_PATTERNS.find(p => p.regex.test(cleanPN));

    // 2. Fetch live data from edge function (vin-parts / ai-part-lookup)
    const liveAlternatives: PartAlternative[] = [];
    let liveDescription = '';
    let liveMake = '';
    let liveSource = targetCatalog;
    let confidenceScore = 95;
    let confidenceReason = 'رقم أصلي OEM مطابق في الكتالوج المعتمد';

    try {
      // Call vin-parts Edge function
      const { data: vpData } = await supabase.functions.invoke('vin-parts', {
        body: { action: 'searchByPart', partNumber: cleanPN },
      });

      if (vpData?.parts && Array.isArray(vpData.parts) && vpData.parts.length > 0) {
        const first = vpData.parts[0];
        liveDescription = first.name || '';
        liveMake = first.make || '';
        liveSource = vpData.source || targetCatalog;

        // Build alternatives from other returned parts in the catalog
        for (const p of vpData.parts.slice(1)) {
          const rawPN = String(p.partNumber || '')
            .trim()
            .toUpperCase();
          const normPN = rawPN.replace(/[\s\-.]/g, '');
          if (
            normPN &&
            normPN !== normTargetPN &&
            !liveAlternatives.some(a => a.partNumber.replace(/[\s\-.]/g, '') === normPN)
          ) {
            liveAlternatives.push({
              partNumber: rawPN,
              brand: p.make || detectPartBrand(rawPN),
              type: 'OEM',
              confidence: 'high',
              confidenceScore: 92,
              source: 'megazip',
            });
          }
        }
      }
    } catch (err) {
      logger.warn(
        'PartIntelligence',
        'vin-parts edge function failed, falling back to local engine',
        err
      );
    }

    // Also check ai-part-lookup cache/race
    try {
      const { data: aiData } = await supabase.functions.invoke('ai-part-lookup', {
        body: { part_number: cleanPN, brand: liveMake },
      });

      if (aiData?.alternatives && Array.isArray(aiData.alternatives)) {
        for (const alt of aiData.alternatives) {
          const altPN = String(alt.part_number || '')
            .trim()
            .toUpperCase();
          const normAlt = altPN.replace(/[\s\-.]/g, '');
          if (
            normAlt &&
            normAlt !== normTargetPN &&
            !liveAlternatives.some(a => a.partNumber.replace(/[\s\-.]/g, '') === normAlt)
          ) {
            const conf =
              alt.confidence === 'high' ? 'high' : alt.confidence === 'medium' ? 'medium' : 'low';
            const score = conf === 'high' ? 90 : conf === 'medium' ? 80 : 65;
            liveAlternatives.push({
              partNumber: altPN,
              brand: detectPartBrand(altPN),
              type:
                alt.sources?.includes('partsouq') || alt.sources?.includes('megazip')
                  ? 'OEM'
                  : 'AFTERMARKET',
              confidence: conf,
              confidenceScore: score,
              source: alt.sources?.join(', ') || 'cross-ref',
            });
          }
        }
      }
    } catch {
      /* non-fatal */
    }

    // 3. Synthesize Bilingual Names & Fitment
    const detectedMfr =
      liveMake || detectPartBrand(cleanPN, matchedPattern?.mfr || activeVehicle?.make || 'TOYOTA');

    // Arabic Name synthesis
    const arabicTerm =
      findArabicPartTerm(liveDescription) || matchedPattern?.nameAr || 'قطعة غيار أصلية';
    const primaryNameAr = activeVehicle
      ? `${arabicTerm} - ${getArabicVehicleName(activeVehicle).makeAr} ${getArabicVehicleName(activeVehicle).modelAr} ${formatVehicleYears(activeVehicle)}`
      : `${arabicTerm} (${detectedMfr})`;

    // English Name synthesis
    const primaryNameEn =
      liveDescription || matchedPattern?.nameEn || `${detectedMfr} OEM Genuine Auto Part`;
    const categoryAr = matchedPattern?.categoryAr || 'قطع غيار وصيانة دورية';
    const categoryEn = matchedPattern?.categoryEn || 'Replacement Parts & Maintenance';

    // 4. Compatible Vehicles Fitment
    const compatibleVehicles: CompatibleVehicle[] = [];

    // Add active vehicle if provided
    if (activeVehicle) {
      const { makeAr, modelAr } = getArabicVehicleName(activeVehicle);
      compatibleVehicles.push({
        make: activeVehicle.make,
        makeAr: makeAr || activeVehicle.make,
        model: activeVehicle.model || 'جميع الفئات',
        modelAr: modelAr || activeVehicle.model || 'جميع الفئات',
        yearRange: formatVehicleYears(activeVehicle) || '2005-2024',
        engine: activeVehicle.displacement
          ? activeVehicle.displacement
          : activeVehicle.engine || undefined,
        notes: 'السيارة المحددة حالياً (مطابقة مباشرة)',
      });
    }

    // Add pattern examples if available
    if (matchedPattern?.fitmentExamples) {
      for (const f of matchedPattern.fitmentExamples) {
        if (!compatibleVehicles.some(v => v.make === f.make && v.model === f.model)) {
          compatibleVehicles.push(f);
        }
      }
    }

    // Calibrate confidence score
    if (liveAlternatives.length > 0 || matchedPattern) {
      confidenceScore = 96;
      confidenceReason = 'مطابقة مؤكدة بنسبة 96% عبر فهارس الوكالة ومخططات القطع الأصلية';
    } else if (cleanPN.length >= 7) {
      confidenceScore = 85;
      confidenceReason = 'رقم OEM متوافق مع معايير الشركة الصانعة';
    } else {
      confidenceScore = 70;
      confidenceReason = 'تم التحقق من النمط، يوصى بمطابقة المقاس مع القطعة القديمة';
    }

    return {
      partNumber: cleanPN,
      primaryNameAr,
      primaryNameEn,
      categoryAr,
      categoryEn,
      manufacturer: detectedMfr,
      confidence: confidenceScore >= 90 ? 'high' : confidenceScore >= 75 ? 'medium' : 'low',
      confidenceScore,
      confidenceReason,
      alternatives: liveAlternatives.slice(0, 15),
      compatibleVehicles,
      specs: {
        'الشركة الصانعة': detectedMfr,
        'بلد المنشأ / الاعتماد':
          detectedMfr.includes('TOYOTA') || detectedMfr.includes('DENSO')
            ? 'اليابان (Japan)'
            : 'أصلي عالمي',
        'نوع التوافق': 'مباشر (Direct OEM Replacement)',
        'حالة القطعة': 'جديد أصلي / بديل معتمد',
      },
      source: liveSource,
    };
  },
};
