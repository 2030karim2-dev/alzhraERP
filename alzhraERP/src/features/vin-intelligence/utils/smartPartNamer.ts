import type { VehicleInfo } from '../types';
import { driveLabel, transLabel } from './vehicleLabels';

/**
 * Automotive parts naming dictionary:
 * Maps English OEM names, categories, and technical terms to popular Arabic/Gulf/Yemeni names.
 */
export const AUTO_PARTS_DICTIONARY: Record<string, { primary: string; synonyms: string[] }> = {
  // Ignition & Electrical
  'spark plug': { primary: 'بلاكات', synonyms: ['بواجي', 'شمعات احتراق'] },
  'sparkplug': { primary: 'بلاكات', synonyms: ['بواجي', 'شمعات احتراق'] },
  'plug, spark': { primary: 'بلاكات', synonyms: ['بواجي', 'شمعات احتراق'] },
  'glow plug': { primary: 'بواجي ديزل', synonyms: ['سخانات ديزل', 'شمعات تسخين'] },
  'ignition coil': { primary: 'كويلات', synonyms: ['كويل', 'ملف إشعال'] },
  'coil, ignition': { primary: 'كويلات', synonyms: ['كويل', 'بوبينة'] },
  'starter': { primary: 'سلف', synonyms: ['مارش', 'بادئ تشغيل'] },
  'starter motor': { primary: 'سلف', synonyms: ['مارش', 'دينمو سلف'] },
  'alternator': { primary: 'دينمو كهرباء', synonyms: ['دينمو شحن', 'مولد كهرباء'] },
  'battery': { primary: 'بطارية', synonyms: [] },
  'fuse': { primary: 'فيوز', synonyms: ['فيوزات'] },
  'relay': { primary: 'كتاوت', synonyms: ['مرحل'] },

  // Brakes & Suspension
  'brake pad': { primary: 'فحمات فرامل', synonyms: ['سفايف', 'أقمشة فرامل', 'تيل فرامل'] },
  'pad set, disc brake': { primary: 'فحمات فرامل', synonyms: ['سفايف', 'أقمشة فرامل'] },
  'brake pads': { primary: 'فحمات فرامل', synonyms: ['سفايف', 'أقمشة فرامل'] },
  'brake shoe': { primary: 'قماشات فرامل', synonyms: ['أقمشة خلفية', 'تيل طنبورة'] },
  'brake disc': { primary: 'هوبات فرامل', synonyms: ['ديسكات', 'أقراص فرامل', 'طنابير'] },
  'rotor, disc brake': { primary: 'هوبات فرامل', synonyms: ['ديسكات', 'طنبورة'] },
  'brake master cylinder': { primary: 'طرمبة فرامل رئيسية', synonyms: ['ماستر فرامل'] },
  'brake caliper': { primary: 'كليبر فرامل', synonyms: ['سرج فرامل'] },
  'shock absorber': { primary: 'مساعدات', synonyms: ['جامبينات', 'مساعد', 'ممتص صدمات'] },
  'absorber set, shock': { primary: 'مساعدات', synonyms: ['جامبينات', 'مساعدات هيدروليك'] },
  'strut': { primary: 'مساعدات كاملة', synonyms: ['جامبينات'] },
  'spring, coil': { primary: 'يايات', synonyms: ['سبرنجات', 'سوست'] },
  'control arm': { primary: 'مقصات', synonyms: ['مقص', 'أذرعة تعليق'] },
  'arm sub-assy, control': { primary: 'مقصات', synonyms: ['مقص'] },
  'ball joint': { primary: 'جوزات', synonyms: ['ركب', 'بيضة مقص'] },
  'tie rod end': { primary: 'أذرعة دركسون خارجية', synonyms: ['ركب دركسون', 'طرف ذراع'] },
  'tie rod': { primary: 'أذرعة دركسون', synonyms: ['أذرعة سكان'] },
  'stabilizer link': { primary: 'مسامير توازن', synonyms: ['روابط استقرار', 'مسمار عمود توازن'] },
  'link sub-assy, stabilizer': { primary: 'مسامير توازن', synonyms: ['مسمار توازن'] },
  'wheel bearing': { primary: 'رمان كفر', synonyms: ['رمان بلي', 'بيرنج عجل'] },
  'hub, wheel': { primary: 'فلنجة كفر', synonyms: ['صرة عجل'] },

  // Filters & Fluids
  'oil filter': { primary: 'فلتر زيت', synonyms: ['سيفون زيت'] },
  'filter, oil': { primary: 'فلتر زيت', synonyms: ['سيفون زيت'] },
  'element sub-assy, oil filter': { primary: 'فلتر زيت', synonyms: ['سيفون'] },
  'air filter': { primary: 'فلتر هواء', synonyms: ['فلتر مكينة'] },
  'filter, air cleaner': { primary: 'فلتر هواء', synonyms: ['فلتر شوية'] },
  'cabin filter': { primary: 'فلتر مكيف', synonyms: ['فلتر صالون'] },
  'filter, air': { primary: 'فلتر هواء', synonyms: [] },
  'fuel filter': { primary: 'فلتر بنزين', synonyms: ['صفاية بنزين', 'فلتر ديزل'] },
  'filter, fuel': { primary: 'فلتر بنزين', synonyms: ['صفاية بنزين'] },

  // Cooling & Climate
  'water pump': { primary: 'طرمبة ماء', synonyms: ['مضخة ماء', 'طلمبة مياه'] },
  'pump sub-assy, water': { primary: 'طرمبة ماء', synonyms: ['طلمبة مياه'] },
  'radiator': { primary: 'رديتر', synonyms: ['مشع حراري', 'رادياتير'] },
  'thermostat': { primary: 'بلف حرارة', synonyms: ['ثرموستات', 'كوع حرارة'] },
  'fan, radiator': { primary: 'مروحة رديتر', synonyms: ['مروحة تبريد'] },
  'compressor, air conditioner': { primary: 'كمبروسر مكيف', synonyms: ['ضاغط مكيف', 'كمبريسر'] },
  'condenser': { primary: 'رديتر مكيف', synonyms: ['مكثف مكيف'] },

  // Belts & Timing
  'timing belt': { primary: 'سير تايمن', synonyms: ['سير صدر', 'سير كاتينة'] },
  'belt, timing': { primary: 'سير تايمن', synonyms: ['سير صدر'] },
  'chain, timing': { primary: 'جنزير مكينة', synonyms: ['جنزير صدر', 'سلسلة توقيت'] },
  'drive belt': { primary: 'سير مكينة', synonyms: ['سير خارجي', 'سير دينمو'] },
  'v-belt': { primary: 'سير مروحة', synonyms: ['سير دينمو'] },
  'belt, v-ribbed': { primary: 'سير مكينة', synonyms: ['سير محرك'] },
  'tensioner': { primary: 'شداد سير', synonyms: ['بكرة شداد'] },

  // Engine & Transmission
  'fuel pump': { primary: 'طرمبة بنزين', synonyms: ['طرمبة وقود', 'فيول بمب'] },
  'pump assy, fuel': { primary: 'طرمبة بنزين', synonyms: ['فيول بمب'] },
  'fuel injector': { primary: 'بخاخات', synonyms: ['رشاشات وقود', 'بخاخ بنزين'] },
  'injector, fuel': { primary: 'بخاخات', synonyms: ['رشاشات'] },
  'clutch disc': { primary: 'صحن كلتش', synonyms: ['أسطوانة دبرياج'] },
  'disc, clutch': { primary: 'صحن كلتش', synonyms: ['دزك'] },
  'clutch cover': { primary: 'دسك كلتش', synonyms: ['دزك كلتش', 'طاقية دبرياج'] },
  'clutch kit': { primary: 'طقم كلتش كامل', synonyms: ['صحن ودسك وفحمة'] },
  'gasket, cylinder head': { primary: 'قازقيت رأس مكينة', synonyms: ['وجه رأس', 'كاسكيت'] },
  'head gasket': { primary: 'قازقيت رأس', synonyms: ['وجه رأس سلندر'] },
  'engine mount': { primary: 'كراسي مكينة', synonyms: ['كرسي محرك', 'قواعد مكينة'] },
  'insulator, engine': { primary: 'كرسي مكينة', synonyms: ['قاعدة محرك'] },

  // Sensors & Exhaust
  'oxygen sensor': { primary: 'حساس شكمان', synonyms: ['حساس أكسجين', 'حساس عادم'] },
  'sensor, oxygen': { primary: 'حساس شكمان', synonyms: ['حساس O2'] },
  'airflow meter': { primary: 'حساس هواء', synonyms: ['حساس ماف', 'MAF Sensor'] },
  'crankshaft sensor': { primary: 'حساس كرنك', synonyms: ['حساس دوران المحرك'] },
  'camshaft sensor': { primary: 'حساس كامة', synonyms: ['حساس التيمن'] },
  'throttle body': { primary: 'ثروتل', synonyms: ['بوابة هواء', 'حبة خانق'] },
};

/** Common Arabic car model mappings */
const ARABIC_MODELS: Record<string, string> = {
  corolla: 'كورولا',
  camry: 'كامري',
  hilux: 'هايلوكس',
  landcruiser: 'لاندكروزر',
  'land cruiser': 'لاندكروزر',
  prado: 'برادو',
  yaris: 'يارس',
  avalon: 'أفالون',
  rav4: 'راف فور',
  fortuner: 'فورتشنر',
  innova: 'إنوفا',
  accent: 'أكسنت',
  elantra: 'إلنترا',
  sonata: 'سوناتا',
  tucson: 'توسان',
  santafe: 'سنتافي',
  'santa fe': 'سنتافي',
  cerato: 'سيراتو',
  optima: 'أوبتيما',
  sportage: 'سبورتاج',
  patrol: 'باترول',
  sunny: 'صني',
  altima: 'ألتيما',
  maxima: 'مكسيما',
  civic: 'سيفيك',
  accord: 'أكورد',
  crv: 'سي آر في',
  'cr-v': 'سي آر في',
  cruze: 'كروز',
  tahoe: 'تاهو',
  yukon: 'يوكن',
  sierra: 'سييرا',
  silverado: 'سلفرادو',
  f150: 'إف 150',
  'f-150': 'إف 150',
  dmax: 'ديماكس',
  'd-max': 'ديماكس',
};

const ARABIC_MAKES: Record<string, string> = {
  toyota: 'تويوتا',
  nissan: 'نيسان',
  hyundai: 'هيونداي',
  kia: 'كيا',
  honda: 'هوندا',
  chevrolet: 'شفروليه',
  gmc: 'جمس',
  ford: 'فورد',
  isuzu: 'إيسوزو',
  mazda: 'مازدا',
  mitsubishi: 'ميتسوبيشي',
  suzuki: 'سوزوكي',
  lexus: 'لكزس',
};

/**
 * Normalizes and extracts Arabic car model & make.
 */
export function getArabicVehicleName(vehicle?: VehicleInfo | null): { makeAr: string; modelAr: string } {
  if (!vehicle) return { makeAr: '', modelAr: '' };
  const rawMake = (vehicle.make || '').toLowerCase().trim();
  const rawModel = (vehicle.model || '').toLowerCase().trim();

  const makeAr = ARABIC_MAKES[rawMake] || vehicle.make || '';
  const modelAr = ARABIC_MODELS[rawModel] || vehicle.model || '';

  return { makeAr, modelAr };
}

/**
 * Finds Arabic term for a given part query (English name, OEM category, or Arabic term).
 */
export function findArabicPartTerm(query: string): string {
  const q = query.toLowerCase().trim();
  if (!q) return '';

  // Direct match in dictionary
  for (const [key, val] of Object.entries(AUTO_PARTS_DICTIONARY)) {
    if (q.includes(key) || key.includes(q)) {
      return val.primary;
    }
    for (const syn of val.synonyms) {
      if (q.includes(syn.toLowerCase())) {
        return val.primary;
      }
    }
  }

  // Common Arabic keywords directly
  if (/بلاك|بوج|شمع/i.test(q)) return 'بلاكات';
  if (/فحم|سفايف|قماش/i.test(q)) return 'فحمات فرامل';
  if (/فلتر.*زيت|سيفون/i.test(q)) return 'فلتر زيت';
  if (/فلتر.*هواء/i.test(q)) return 'فلتر هواء';
  if (/فلتر.*مكيف/i.test(q)) return 'فلتر مكيف';
  if (/مساعد|جامبين/i.test(q)) return 'مساعدات';
  if (/طرمب.*بنزين|فيول/i.test(q)) return 'طرمبة بنزين';
  if (/طرمب.*ماء|طلمب/i.test(q)) return 'طرمبة ماء';
  if (/سير.*تايمن|كاتين/i.test(q)) return 'سير تايمن';
  if (/سير.*مكين/i.test(q)) return 'سير مكينة';
  if (/سلف|مارش/i.test(q)) return 'سلف';
  if (/دينمو/i.test(q)) return 'دينمو';
  if (/رديتر|راديات/i.test(q)) return 'رديتر';
  if (/كلتش|دبرياج|دزك/i.test(q)) return 'صحن كلتش';

  return query.trim();
}

/**
 * Builds standard years string (e.g., "2001-2007" or "2001").
 */
export function formatVehicleYears(vehicle?: VehicleInfo | null): string {
  if (!vehicle) return '';
  const yStart = vehicle.yearStart || vehicle.year;
  const yEnd = vehicle.yearEnd;

  if (yStart && yEnd && yStart !== yEnd) {
    return `${yStart}-${yEnd}`;
  }
  if (yStart) {
    return `${yStart}`;
  }
  return '';
}

/**
 * Builds smart engine specification label (e.g., "مكينة 1.8" or "1800cc").
 */
export function formatEngineSpec(vehicle?: VehicleInfo | null): string {
  if (!vehicle) return '';
  if (vehicle.displacement) {
    const d = parseFloat(vehicle.displacement);
    if (!isNaN(d)) return `مكينة ${d}`;
  }
  if (vehicle.engine) {
    const e = vehicle.engine.trim();
    if (/^\d+(\.\d+)?$/.test(e)) {
      return `مكينة ${e}`;
    }
    return e;
  }
  return '';
}

/**
 * Generates the full, consistent Arabic product name combining part name and car specs.
 * Example output: "بلاكات كرولا 2001-2007 خليجي تماتيك مكينة 1.8"
 */
export function generateSmartPartName(
  partQuery: string,
  vehicle?: VehicleInfo | null,
  options?: {
    includeMake?: boolean;
    includeEngine?: boolean;
    includeTrans?: boolean;
    includeMarket?: boolean;
  }
): string {
  const opts = {
    includeMake: false, // Usually model is enough like "كرولا", but if make differs it's optional
    includeEngine: true,
    includeTrans: true,
    includeMarket: true,
    ...options,
  };

  const partName = findArabicPartTerm(partQuery) || partQuery.trim() || 'قطعة غيار';
  if (!vehicle) return partName;

  const { makeAr, modelAr } = getArabicVehicleName(vehicle);
  const years = formatVehicleYears(vehicle);
  const engine = opts.includeEngine ? formatEngineSpec(vehicle) : '';
  
  // Market label (e.g. خليجي, وارد أمريكي, ياباني)
  let market = '';
  if (opts.includeMarket && vehicle.market) {
    market = vehicle.market;
  } else if (opts.includeMarket && vehicle.region) {
    market = vehicle.region;
  }

  // Transmission (تماتيك / عادي)
  let trans = '';
  if (opts.includeTrans && vehicle.transmission) {
    trans = transLabel(vehicle.transmission);
    if (trans === 'أوتوماتيك') trans = 'تماتيك'; // popular Gulf phrasing
  }

  // Drive (دبل / سنجل)
  let drive = '';
  if (vehicle.driveType) {
    const d = driveLabel(vehicle.driveType);
    if (d === 'دبل') drive = 'دبل';
  }

  // Assemble components
  const parts: string[] = [partName];

  if (opts.includeMake && makeAr && !modelAr.includes(makeAr)) {
    parts.push(makeAr);
  }
  if (modelAr) {
    parts.push(modelAr);
  }
  if (years) {
    parts.push(years);
  }
  if (market) {
    parts.push(market);
  }
  if (trans) {
    parts.push(trans);
  }
  if (drive) {
    parts.push(drive);
  }
  if (engine) {
    parts.push(engine);
  }

  return parts.filter(Boolean).join(' ');
}
