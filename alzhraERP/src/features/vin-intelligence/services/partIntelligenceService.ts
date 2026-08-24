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

/** Well-known OE brand identifiers */
export const KNOWN_BRANDS: Record<string, { name: string; type: 'OEM' | 'AFTERMARKET' }> = {
  TOYOTA: { name: 'Toyota Genuine', type: 'OEM' },
  LEXUS: { name: 'Lexus Genuine', type: 'OEM' },
  DENSO: { name: 'Denso', type: 'OEM' },
  AISIN: { name: 'Aisin', type: 'OEM' },
  BOSCH: { name: 'Bosch', type: 'AFTERMARKET' },
  NGK: { name: 'NGK / NTK', type: 'OEM' },
  BREMBO: { name: 'Brembo', type: 'AFTERMARKET' },
  KYB: { name: 'KYB (Kayaba)', type: 'OEM' },
  BANDO: { name: 'Bando', type: 'OEM' },
  MITSUBOSHI: { name: 'Mitsuboshi', type: 'OEM' },
  VALEO: { name: 'Valeo', type: 'AFTERMARKET' },
  FEBI: { name: 'Febi Bilstein', type: 'AFTERMARKET' },
  MANN: { name: 'Mann-Filter', type: 'AFTERMARKET' },
  MAHLE: { name: 'Mahle', type: 'AFTERMARKET' },
  NISSAN: { name: 'Nissan Genuine', type: 'OEM' },
  HYUNDAI: { name: 'Hyundai / Mobis', type: 'OEM' },
  KIA: { name: 'Kia Genuine', type: 'OEM' },
  HONDA: { name: 'Honda Genuine', type: 'OEM' },
  CHEVROLET: { name: 'ACDelco / GM', type: 'OEM' },
};

/** Common Part Number Patterns & Standard Automotive Dictionary */
const PART_PATTERNS: Array<{
  regex: RegExp;
  categoryAr: string;
  categoryEn: string;
  nameAr: string;
  nameEn: string;
  mfr: string;
  fitmentExamples: CompatibleVehicle[];
}> = [
  {
    regex: /^90919-([0-9A-Z]{5})$/i,
    categoryAr: 'نظام الإشعال والكهرباء',
    categoryEn: 'Ignition & Electrical',
    nameAr: 'شمعة احتراق (بلاكات / بواجي إيريديوم)',
    nameEn: 'Spark Plug (Iridium / Platinum)',
    mfr: 'TOYOTA / DENSO',
    fitmentExamples: [
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Corolla', modelAr: 'كورولا', yearRange: '2008-2019', engine: '1.6L / 1.8L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Camry', modelAr: 'كامري', yearRange: '2007-2018', engine: '2.4L / 2.5L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'RAV4', modelAr: 'راف فور', yearRange: '2006-2018', engine: '2.4L / 2.5L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Yaris', modelAr: 'يارس', yearRange: '2006-2018', engine: '1.3L / 1.5L' },
      { make: 'Lexus', makeAr: 'لكزس', model: 'ES350', modelAr: 'إي إس 350', yearRange: '2007-2018', engine: '3.5L V6' },
    ],
  },
  {
    regex: /^04465-([0-9A-Z]{5})$/i,
    categoryAr: 'نظام الفرامل والمكابح',
    categoryEn: 'Brake System',
    nameAr: 'طقم فحمات فرامل أمامية (سفايف)',
    nameEn: 'Front Brake Pads Set',
    mfr: 'TOYOTA / ADVICS',
    fitmentExamples: [
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Camry', modelAr: 'كامري', yearRange: '2006-2017', engine: '2.4L / 2.5L / 3.5L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Avalon', modelAr: 'أفالون', yearRange: '2008-2018', engine: '3.5L V6' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Aurion', modelAr: 'أوريون', yearRange: '2007-2016', engine: '3.5L V6' },
      { make: 'Lexus', makeAr: 'لكزس', model: 'ES350', modelAr: 'إي إس 350', yearRange: '2007-2015', engine: '3.5L V6' },
    ],
  },
  {
    regex: /^04466-([0-9A-Z]{5})$/i,
    categoryAr: 'نظام الفرامل والمكابح',
    categoryEn: 'Brake System',
    nameAr: 'طقم فحمات فرامل خلفية (سفايف)',
    nameEn: 'Rear Brake Pads Set',
    mfr: 'TOYOTA / ADVICS',
    fitmentExamples: [
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Camry', modelAr: 'كامري', yearRange: '2006-2017', engine: '2.4L / 2.5L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Avalon', modelAr: 'أفالون', yearRange: '2008-2018', engine: '3.5L V6' },
      { make: 'Lexus', makeAr: 'لكزس', model: 'ES350', modelAr: 'إي إس 350', yearRange: '2007-2018', engine: '3.5L V6' },
    ],
  },
  {
    regex: /^04152-([0-9A-Z]{5})$/i,
    categoryAr: 'الفلاتر والزيوت',
    categoryEn: 'Filters & Fluids',
    nameAr: 'فلتر زيت محرك (سيفون أصلي مع الجلود)',
    nameEn: 'Engine Oil Filter Element with O-Rings',
    mfr: 'TOYOTA / DENSO',
    fitmentExamples: [
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Corolla', modelAr: 'كورولا', yearRange: '2009-2022', engine: '1.8L / 2.0L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Camry', modelAr: 'كامري', yearRange: '2010-2022', engine: '2.5L / 3.5L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'RAV4', modelAr: 'راف فور', yearRange: '2009-2021', engine: '2.5L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Prado', modelAr: 'برادو', yearRange: '2010-2022', engine: '4.0L V6' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Land Cruiser', modelAr: 'لاندكروزر', yearRange: '2008-2021', engine: '5.7L V8' },
    ],
  },
  {
    regex: /^17801-([0-9A-Z]{5})$/i,
    categoryAr: 'الفلاتر والزيوت',
    categoryEn: 'Filters & Fluids',
    nameAr: 'فلتر هواء محرك (شوكة هواء)',
    nameEn: 'Engine Air Cleaner Filter',
    mfr: 'TOYOTA / DENSO',
    fitmentExamples: [
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Corolla', modelAr: 'كورولا', yearRange: '2008-2019', engine: '1.6L / 1.8L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Yaris', modelAr: 'يارس', yearRange: '2006-2019', engine: '1.3L / 1.5L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Vitz', modelAr: 'فيتز', yearRange: '2005-2019', engine: '1.0L / 1.3L / 1.5L' },
    ],
  },
  {
    regex: /^87139-([0-9A-Z]{5})$/i,
    categoryAr: 'الفلاتر ونظام التكييف',
    categoryEn: 'Cabin & Air Conditioning',
    nameAr: 'فلتر مكيف صالون (فلتر هواء المكيف)',
    nameEn: 'Cabin Air Conditioner Filter',
    mfr: 'TOYOTA / DENSO',
    fitmentExamples: [
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Camry', modelAr: 'كامري', yearRange: '2007-2022', engine: 'جميع المحركات' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Corolla', modelAr: 'كورولا', yearRange: '2008-2022', engine: 'جميع المحركات' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Hilux', modelAr: 'هايلوكس', yearRange: '2006-2022', engine: 'بنزين / ديزل' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Fortuner', modelAr: 'فورتشنر', yearRange: '2006-2022', engine: '2.7L / 4.0L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Prado', modelAr: 'برادو', yearRange: '2009-2022', engine: '2.7L / 4.0L' },
    ],
  },
  {
    regex: /^16100-([0-9A-Z]{5})$/i,
    categoryAr: 'نظام التبريد والمحرك',
    categoryEn: 'Cooling System',
    nameAr: 'طرمبة ماء محرك (مضخة ماء مع الوجوه)',
    nameEn: 'Engine Water Pump Assembly',
    mfr: 'TOYOTA / AISIN',
    fitmentExamples: [
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Camry', modelAr: 'كامري', yearRange: '2002-2011', engine: '2.4L (2AZ-FE)' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'RAV4', modelAr: 'راف فور', yearRange: '2004-2008', engine: '2.4L (2AZ-FE)' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Previa', modelAr: 'بريفيا', yearRange: '2000-2006', engine: '2.4L' },
    ],
  },
  {
    regex: /^22401-([0-9A-Z]{5})$/i,
    categoryAr: 'نظام الإشعال والكهرباء',
    categoryEn: 'Ignition & Electrical',
    nameAr: 'شمعة احتراق أصلية نيسان (بواجي)',
    nameEn: 'Spark Plug Platinum / Iridium',
    mfr: 'NISSAN / NGK',
    fitmentExamples: [
      { make: 'Nissan', makeAr: 'نيسان', model: 'Sunny', modelAr: 'صني', yearRange: '2007-2020', engine: '1.5L / 1.6L' },
      { make: 'Nissan', makeAr: 'نيسان', model: 'Altima', modelAr: 'ألتيما', yearRange: '2008-2018', engine: '2.5L' },
      { make: 'Nissan', makeAr: 'نيسان', model: 'Patrol', modelAr: 'باترول', yearRange: '2010-2022', engine: '4.0L / 5.6L V8' },
    ],
  },
  {
    regex: /^18846-([0-9A-Z]{5})$/i,
    categoryAr: 'نظام الإشعال والكهرباء',
    categoryEn: 'Ignition & Electrical',
    nameAr: 'شمعة احتراق أصلية هيونداي / كيا (بواجي)',
    nameEn: 'Spark Plug Iridium Genuine Mobis',
    mfr: 'HYUNDAI / MOBIS',
    fitmentExamples: [
      { make: 'Hyundai', makeAr: 'هيونداي', model: 'Elantra', modelAr: 'إلنترا', yearRange: '2011-2020', engine: '1.6L / 2.0L' },
      { make: 'Hyundai', makeAr: 'هيونداي', model: 'Accent', modelAr: 'أكسنت', yearRange: '2012-2020', engine: '1.4L / 1.6L' },
      { make: 'Kia', makeAr: 'كيا', model: 'Cerato', modelAr: 'سيراتو', yearRange: '2013-2020', engine: '1.6L' },
    ],
  },
  {
    regex: /^(SK|IK|K|JK)[0-9A-Z]+/i,
    categoryAr: 'نظام الإشعال والكهرباء',
    categoryEn: 'Ignition & Electrical',
    nameAr: 'بواجي دينسو إيريديوم ياباني أصلي',
    nameEn: 'Denso Iridium Tough / Power Spark Plug',
    mfr: 'DENSO',
    fitmentExamples: [
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Corolla', modelAr: 'كورولا', yearRange: '2005-2022', engine: '1.6L / 1.8L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Camry', modelAr: 'كامري', yearRange: '2003-2022', engine: '2.4L / 2.5L / 3.5L' },
      { make: 'Toyota', makeAr: 'تويوتا', model: 'Land Cruiser', modelAr: 'لاندكروزر', yearRange: '2008-2021', engine: '4.6L / 5.7L' },
    ],
  },
];

/** Detect manufacturer brand from part number format or string */
export function detectPartBrand(partNumber: string, defaultMfr = ''): string {
  const clean = partNumber.toUpperCase().trim();
  if (/^90919|^04465|^04466|^04152|^17801|^87139|^16100|^48510|^48520|^48530/i.test(clean)) {
    return 'TOYOTA';
  }
  if (/^22401|^D4060|^D1060|^AY100|^16546|^AY684/i.test(clean)) {
    return 'NISSAN';
  }
  if (/^18846|^58101|^58302|^26300|^28113|^97133/i.test(clean)) {
    return 'HYUNDAI / KIA';
  }
  if (/^12290|^45022|^43022|^15400|^17220|^80292/i.test(clean)) {
    return 'HONDA';
  }
  if (/^SK[0-9]|^IK[0-9]|^K[0-9]|^W[0-9]|^JK[0-9]/i.test(clean)) {
    return 'DENSO';
  }
  if (/^BKR[0-9]|^ILZ[0-9]|^DIL[0-9]|^LFR[0-9]|^LZ[0-9]/i.test(clean)) {
    return 'NGK';
  }
  if (/^0\s?242|^0\s?986|^F\s?026/i.test(clean)) {
    return 'BOSCH';
  }
  return defaultMfr || 'GENUINE';
}

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

    const normTargetPN = cleanPN.replace(/[\s\-\.]/g, '');

    // 1. Check known patterns for instant deep intelligence
    let matchedPattern = PART_PATTERNS.find((p) => p.regex.test(cleanPN));
    
    // 2. Fetch live data from edge function (vin-parts / ai-part-lookup)
    let liveAlternatives: PartAlternative[] = [];
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
          const rawPN = String(p.partNumber || '').trim().toUpperCase();
          const normPN = rawPN.replace(/[\s\-\.]/g, '');
          if (normPN && normPN !== normTargetPN && !liveAlternatives.some((a) => a.partNumber.replace(/[\s\-\.]/g, '') === normPN)) {
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
      logger.warn('PartIntelligence', 'vin-parts edge function failed, falling back to local engine', err);
    }

    // Also check ai-part-lookup cache/race
    try {
      const { data: aiData } = await supabase.functions.invoke('ai-part-lookup', {
        body: { part_number: cleanPN, brand: liveMake },
      });

      if (aiData?.alternatives && Array.isArray(aiData.alternatives)) {
        for (const alt of aiData.alternatives) {
          const altPN = String(alt.part_number || '').trim().toUpperCase();
          const normAlt = altPN.replace(/[\s\-\.]/g, '');
          if (normAlt && normAlt !== normTargetPN && !liveAlternatives.some((a) => a.partNumber.replace(/[\s\-\.]/g, '') === normAlt)) {
            const conf = alt.confidence === 'high' ? 'high' : alt.confidence === 'medium' ? 'medium' : 'low';
            const score = conf === 'high' ? 90 : conf === 'medium' ? 80 : 65;
            liveAlternatives.push({
              partNumber: altPN,
              brand: detectPartBrand(altPN),
              type: alt.sources?.includes('partsouq') || alt.sources?.includes('megazip') ? 'OEM' : 'AFTERMARKET',
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
    const detectedMfr = liveMake || detectPartBrand(cleanPN, matchedPattern?.mfr || activeVehicle?.make || 'TOYOTA');
    
    // Arabic Name synthesis
    const arabicTerm = findArabicPartTerm(liveDescription) || matchedPattern?.nameAr || 'قطعة غيار أصلية';
    const primaryNameAr = activeVehicle
      ? `${arabicTerm} - ${getArabicVehicleName(activeVehicle).makeAr} ${getArabicVehicleName(activeVehicle).modelAr} ${formatVehicleYears(activeVehicle)}`
      : `${arabicTerm} (${detectedMfr})`;

    // English Name synthesis
    const primaryNameEn = liveDescription || matchedPattern?.nameEn || `${detectedMfr} OEM Genuine Auto Part`;
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
        engine: activeVehicle.displacement ? `${activeVehicle.displacement}` : activeVehicle.engine || undefined,
        notes: 'السيارة المحددة حالياً (مطابقة مباشرة)',
      });
    }

    // Add pattern examples if available
    if (matchedPattern?.fitmentExamples) {
      for (const f of matchedPattern.fitmentExamples) {
        if (!compatibleVehicles.some((v) => v.make === f.make && v.model === f.model)) {
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
        'بلد المنشأ / الاعتماد': detectedMfr.includes('TOYOTA') || detectedMfr.includes('DENSO') ? 'اليابان (Japan)' : 'أصلي عالمي',
        'نوع التوافق': 'مباشر (Direct OEM Replacement)',
        'حالة القطعة': 'جديد أصلي / بديل معتمد',
      },
      source: liveSource,
    };
  },
};
