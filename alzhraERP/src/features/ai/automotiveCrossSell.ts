/**
 * Automotive Cross-Sell Domain Engine
 *
 * Provides offline, instant (<1ms) heuristic companion product recommendations
 * for auto parts and vehicle maintenance. Used as a resilient baseline and
 * offline fallback for POS cross-selling so the cashier experience never hangs
 * or fails when cloud AI is unreachable or disabled.
 */

export interface CompanionRule {
  keywords: string[];
  recommendations: string[];
}

/**
 * Automotive companion rules based on real-world workshop and spare parts sales patterns.
 */
export const AUTOMOTIVE_COMPANION_RULES: readonly CompanionRule[] = [
  // Engine Oil & Lubricants
  {
    keywords: [
      'زيت',
      'محرك',
      'تخليقي',
      'engine oil',
      'سيفون',
      '5w30',
      '10w40',
      '20w50',
      '5w40',
      '0w20',
    ],
    recommendations: ['فلتر زيت محرك', 'فلتر هواء محرك', 'فلتر مكيف', 'وردة صرة زيت'],
  },
  // Transmission Fluid
  {
    keywords: ['قير', 'جير', 'ناقل حركة', 'transmission', 'atf', 'cvt'],
    recommendations: ['فلتر قير', 'وجه كارتير قير', 'معالج زيت قير'],
  },
  // Brake System
  {
    keywords: ['قماش', 'قماشات', 'فحمات', 'فرامل', 'تيل', 'brake', 'brake pad'],
    recommendations: ['هوبات فرامل أمامية', 'هوبات فرامل خلفية', 'زيت فرامل DOT4', 'منظف فرامل'],
  },
  {
    keywords: ['هوب', 'هوبات', 'دسك', 'rotor', 'brake disc'],
    recommendations: ['فحمات فرامل أصلية', 'مسامير كليبر', 'شحم كليبر حراري'],
  },
  // Ignition System
  {
    keywords: ['بواجي', 'شمعات', 'شمعة', 'spark plug', 'بوجيه'],
    recommendations: ['كويلات إشعال', 'أسلاك بواجي', 'منظف بخاخات', 'فلتر بنزين'],
  },
  {
    keywords: ['كويل', 'كويلات', 'coil', 'ignition coil'],
    recommendations: ['طقم بواجي ليزر', 'فيش كويل', 'حساس كرنك'],
  },
  // Suspension & Steering
  {
    keywords: ['مساعد', 'مساعدات', 'عكوس', 'shock absorber', 'strut'],
    recommendations: ['كراسي مساعدات', 'جلود مقصات', 'مسامير توازن', 'جلد غطاء غبار'],
  },
  {
    keywords: ['مقص', 'مقصات', 'control arm', 'ركبة'],
    recommendations: ['أذرعة دركسون', 'مسامير توازن', 'كراسي مساعدات', 'جلد عكوس'],
  },
  // Belts & Timing
  {
    keywords: ['سير', 'سير مكينة', 'belt', 'serpentine', 'تيمين', 'صدر'],
    recommendations: ['شداد سير', 'بكرة سير', 'طرمبة ماء'],
  },
  // Cooling System
  {
    keywords: ['رديتر', 'راديتر', 'radiator', 'ماء رديتر', 'coolant'],
    recommendations: ['غطاء رديتر أصلي', 'بلف حرارة (ثرموستات)', 'طرمبة ماء', 'ليات رديتر'],
  },
  {
    keywords: ['طرمبة ماء', 'مضخة ماء', 'water pump'],
    recommendations: ['بلف حرارة', 'سائل تبريد أصلي', 'سير محرك', 'معجون وجيه'],
  },
  // Fuel System
  {
    keywords: ['طرمبة بنزين', 'طلمبة بنزين', 'fuel pump', 'فلتر بنزين'],
    recommendations: ['فلتر بنزين خارجي', 'منظف دورة الوقود', 'حلق غطاء تانكي'],
  },
  // Electrical & Battery
  {
    keywords: ['بطارية', 'battery', 'دينمو', 'سلف'],
    recommendations: ['أصابع بطارية نحاس', 'بخاخ حماية أصابع البطارية', 'سير دينمو'],
  },
  // Air Conditioning
  {
    keywords: ['كمبروسر', 'ضاغط', 'مكيف', 'فريون', 'ac compressor'],
    recommendations: ['فلتر مكيف (كابينة)', 'سير مكيف', 'بلف مكيف', 'زيت كمبروسر'],
  },
  // Wipers & Visibility
  {
    keywords: ['مساحات', 'شفرات مساحات', 'wiper', 'wipers'],
    recommendations: ['ماء مساحات مركز', 'لمبات هالوجين/LED', 'ملمع زجاج'],
  },
];

/**
 * Normalizes an item name for comparison: lowers case and strips common non-alphanumeric noise.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts local cross-sell suggestions based on items in the cart.
 *
 * @param cartItemNames List of item names currently in the cart
 * @param limit Maximum number of suggestions to return (default: 6)
 * @returns Deduplicated list of recommended products
 */
export function getLocalCrossSellSuggestions(cartItemNames: string[], limit = 6): string[] {
  if (!cartItemNames || cartItemNames.length === 0) {
    return [];
  }

  const normalizedCart = cartItemNames.map(normalizeText);
  const matchedRecommendations: string[] = [];

  for (const cartName of normalizedCart) {
    if (!cartName) continue;

    for (const rule of AUTOMOTIVE_COMPANION_RULES) {
      const isMatch = rule.keywords.some(kw => {
        const normalizedKw = normalizeText(kw);
        return cartName.includes(normalizedKw) || normalizedKw.includes(cartName);
      });

      if (isMatch) {
        for (const rec of rule.recommendations) {
          // Avoid suggesting something already in the cart
          const recNorm = normalizeText(rec);
          const alreadyInCart = normalizedCart.some(
            c => c.includes(recNorm) || recNorm.includes(c)
          );
          if (!alreadyInCart && !matchedRecommendations.includes(rec)) {
            matchedRecommendations.push(rec);
          }
        }
      }
    }
  }

  // If no specific keyword matched, supply top fast-moving universal maintenance companion parts
  if (matchedRecommendations.length === 0) {
    const universalFallbacks = [
      'فلتر زيت محرك',
      'فلتر هواء محرك',
      'ماء مساحات مركز',
      'زيت فرامل DOT4',
      'منظف بخاخات',
      'فلتر مكيف',
    ];
    for (const item of universalFallbacks) {
      const itemNorm = normalizeText(item);
      const alreadyInCart = normalizedCart.some(c => c.includes(itemNorm) || itemNorm.includes(c));
      if (!alreadyInCart && !matchedRecommendations.includes(item)) {
        matchedRecommendations.push(item);
      }
    }
  }

  return matchedRecommendations.slice(0, limit);
}
