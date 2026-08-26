import type { VehicleInfo } from '../types';
import { transLabel } from './vehicleLabels';

/**
 * Automotive parts naming dictionary:
 * Maps English OEM names, categories, and technical terms to popular Arabic/Gulf/Yemeni names.
 */
export const AUTO_PARTS_DICTIONARY: Record<string, { primary: string; synonyms: string[] }> = {
  // Ignition & Electrical
  'spark plug': { primary: 'بلاكات', synonyms: ['بواجي', 'شمعات احتراق', 'بلكات'] },
  sparkplug: { primary: 'بلاكات', synonyms: ['بواجي', 'شمعات احتراق', 'بلكات'] },
  'plug, spark': { primary: 'بلاكات', synonyms: ['بواجي', 'شمعات احتراق', 'بلكات'] },
  'glow plug': { primary: 'بواجي ديزل', synonyms: ['سخانات ديزل', 'شمعات تسخين'] },
  'ignition coil': { primary: 'كويلات', synonyms: ['كويل', 'ملف إشعال', 'بوبينة'] },
  'coil, ignition': { primary: 'كويلات', synonyms: ['كويل', 'بوبينة'] },
  starter: { primary: 'سلف', synonyms: ['مارش', 'بادئ تشغيل'] },
  'starter motor': { primary: 'سلف', synonyms: ['مارش', 'دينمو سلف'] },
  alternator: { primary: 'دينمو', synonyms: ['دينمو شحن', 'مولد كهرباء', 'دينمو كهرباء'] },
  battery: { primary: 'بطارية', synonyms: [] },
  fuse: { primary: 'فيوز', synonyms: ['فيوزات'] },
  relay: { primary: 'كتاوت', synonyms: ['مرحل'] },

  // Brakes & Suspension
  'brake pad': { primary: 'فحمات فرامل', synonyms: ['سفايف', 'أقمشة فرامل', 'تيل فرامل'] },
  'pad set, disc brake': { primary: 'فحمات فرامل', synonyms: ['سفايف', 'أقمشة فرامل'] },
  'brake pads': { primary: 'فحمات فرامل', synonyms: ['سفايف', 'أقمشة فرامل'] },
  'brake shoe': { primary: 'قماشات فرامل', synonyms: ['أقمشة خلفية', 'تيل طنبورة'] },
  'brake disc': { primary: 'هوبات فرامل', synonyms: ['ديسكات', 'أقراص فرامل', 'طنابير'] },
  'rotor, disc brake': { primary: 'هوبات فرامل', synonyms: ['ديسكات', 'طنبورة'] },
  'brake master cylinder': { primary: 'طرمبة فرامل رئيسية', synonyms: ['ماستر فرامل'] },
  'brake caliper': { primary: 'كليبر فرامل', synonyms: ['سرج فرامل'] },
  'shock absorber': {
    primary: 'مساعدات',
    synonyms: ['جامبينات', 'جمبينات', 'مساعد', 'ممتص صدمات'],
  },
  'absorber set, shock': {
    primary: 'مساعدات',
    synonyms: ['جامبينات', 'جمبينات', 'مساعدات هيدروليك'],
  },
  strut: { primary: 'مساعدات كاملة', synonyms: ['جامبينات', 'جمبينات'] },
  'spring, coil': { primary: 'يايات', synonyms: ['سبرنجات', 'سوست'] },
  'control arm': { primary: 'مقصات', synonyms: ['مقص', 'أذرعة تعليق'] },
  'arm sub-assy, control': { primary: 'مقصات', synonyms: ['مقص'] },
  'ball joint': { primary: 'جوزات', synonyms: ['ركب', 'بيضة مقص', 'جوزة'] },
  'tie rod end': { primary: 'أذرعة دركسون خارجية', synonyms: ['ركب دركسون', 'طرف ذراع'] },
  'tie rod': { primary: 'أذرعة دركسون', synonyms: ['أذرعة سكان'] },
  'stabilizer link': { primary: 'مسامير توازن', synonyms: ['روابط استقرار', 'مسمار عمود توازن'] },
  'link sub-assy, stabilizer': { primary: 'مسامير توازن', synonyms: ['مسمار توازن'] },
  'wheel bearing': { primary: 'رمان كفر', synonyms: ['رمان بلي', 'بيرنج عجل'] },
  'hub, wheel': { primary: 'فلنجة كفر', synonyms: ['صرة عجل'] },
  'cv axle': { primary: 'عكوس', synonyms: ['عكس', 'كبسة', 'عمود كاردان'] },
  'shaft assy, drive': { primary: 'عكوس', synonyms: ['عكس', 'عمود دوران'] },

  // Filters & Fluids
  'oil filter': { primary: 'فلتر زيت', synonyms: ['سيفون زيت', 'سيفون'] },
  'filter, oil': { primary: 'فلتر زيت', synonyms: ['سيفون زيت', 'سيفون'] },
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
  radiator: { primary: 'رديتر', synonyms: ['مشع حراري', 'رادياتير', 'رديتر ماء'] },
  thermostat: { primary: 'بلف حرارة', synonyms: ['ثرموستات', 'كوع حرارة'] },
  'fan, radiator': { primary: 'مروحة رديتر', synonyms: ['مروحة تبريد'] },
  'compressor, air conditioner': {
    primary: 'كمبروسر مكيف',
    synonyms: ['ضاغط مكيف', 'كمبريسر', 'كمبروسر'],
  },
  condenser: { primary: 'رديتر مكيف', synonyms: ['مكثف مكيف'] },

  // Belts & Timing
  'timing belt': { primary: 'سير تايمن', synonyms: ['سير صدر', 'سير كاتينة'] },
  'belt, timing': { primary: 'سير تايمن', synonyms: ['سير صدر'] },
  'chain, timing': { primary: 'جنزير مكينة', synonyms: ['جنزير صدر', 'سلسلة توقيت'] },
  'drive belt': { primary: 'سير مكينة', synonyms: ['سير خارجي', 'سير دينمو', 'سير مكينة'] },
  'v-belt': { primary: 'سير مروحة', synonyms: ['سير دينمو'] },
  'belt, v-ribbed': { primary: 'سير مكينة', synonyms: ['سير محرك'] },
  tensioner: { primary: 'شداد سير', synonyms: ['بكرة شداد'] },

  // Engine & Transmission
  'fuel pump': { primary: 'طرمبة بنزين', synonyms: ['طرمبة وقود', 'فيول بمب'] },
  'pump assy, fuel': { primary: 'طرمبة بنزين', synonyms: ['فيول بمب'] },
  'fuel injector': { primary: 'بخاخات', synonyms: ['رشاشات وقود', 'بخاخ بنزين'] },
  'injector, fuel': { primary: 'بخاخات', synonyms: ['رشاشات'] },
  'clutch disc': { primary: 'صحن كلتش', synonyms: ['أسطوانة دبرياج'] },
  'disc, clutch': { primary: 'صحن كلتش', synonyms: ['دزك'] },
  'clutch cover': { primary: 'دسك كلتش', synonyms: ['دزك كلتش', 'طاقية دبرياج'] },
  'clutch kit': { primary: 'طقم كلتش كامل', synonyms: ['صحن ودسك وفحمة'] },
  'gasket, cylinder head': {
    primary: 'قازقيت رأس مكينة',
    synonyms: ['وجه رأس', 'كاسكيت', 'طقم وجوه'],
  },
  'head gasket': { primary: 'قازقيت رأس', synonyms: ['وجه رأس سلندر'] },
  'engine mount': { primary: 'كراسي مكينة', synonyms: ['كرسي محرك', 'قواعد مكينة', 'كرسي مكينة'] },
  'insulator, engine': { primary: 'كرسي مكينة', synonyms: ['قاعدة محرك'] },
  'transmission mount': { primary: 'كرسي جير', synonyms: ['كرسي قير', 'قاعدة قير'] },

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
  vitz: 'فيتز',
  passo: 'باسو',
  yaris: 'يارس',
  belta: 'بيلتا',
  rush: 'راش',
  prius: 'بريوس',
  auris: 'أوريس',
  corolla: 'كورولا',
  camry: 'كامري',
  hilux: 'هايلوكس',
  landcruiser: 'لاندكروزر',
  'land cruiser': 'لاندكروزر',
  'land cruiser 70': 'شاص',
  lc70: 'شاص',
  shas: 'شاص',
  prado: 'برادو',
  'land cruiser prado': 'برادو',
  'fj cruiser': 'اف جي',
  echo: 'إيكو',
  avalon: 'أفالون',
  aurion: 'أوريون',
  rav4: 'راف فور',
  fortuner: 'فورتشنر',
  innova: 'إنوفا',
  hiace: 'هايس',
  coaster: 'كوستر',
  accent: 'أكسنت',
  elantra: 'إلنترا',
  sonata: 'سوناتا',
  azera: 'أزيرا',
  tucson: 'توسان',
  santafe: 'سنتافي',
  'santa fe': 'سنتافي',
  creta: 'كريتا',
  cerato: 'سيراتو',
  optima: 'أوبتيما',
  k5: 'K5',
  rio: 'ريو',
  carnival: 'كارنيفال',
  pegas: 'بيجاس',
  cadenza: 'كادينزا',
  sportage: 'سبورتاج',
  sorento: 'سورينتو',
  patrol: 'باترول',
  sunny: 'صني',
  altima: 'ألتيما',
  maxima: 'مكسيما',
  navara: 'نافارا',
  sentra: 'سنترا',
  tiida: 'تيدا',
  'x-trail': 'إكس تريل',
  xtrail: 'إكس تريل',
  pathfinder: 'باثفايندر',
  civic: 'سيفيك',
  accord: 'أكورد',
  crv: 'سي آر في',
  'cr-v': 'سي آر في',
  city: 'سيتي',
  cruze: 'كروز',
  malibu: 'ماليبو',
  traverse: 'ترافيرس',
  tahoe: 'تاهو',
  yukon: 'يوكن',
  suburban: 'سوبربان',
  sierra: 'سييرا',
  silverado: 'سلفرادو',
  f150: 'إف 150',
  'f-150': 'إف 150',
  explorer: 'إكسبلورر',
  expedition: 'إكسبيديشن',
  taurus: 'تورس',
  ranger: 'رينجر',
  dmax: 'ديماكس',
  'd-max': 'ديماكس',
  pajero: 'باجيرو',
  lancer: 'لانسر',
  canter: 'كانتر',
  'grand vitara': 'جراند فيتارا',
  vitara: 'فيتارا',
  swift: 'سويفت',
  jimny: 'جيمني',
  baleno: 'بالينو',
  ls: 'LS',
  es: 'ES',
  gs: 'GS',
  is: 'IS',
  lx: 'LX',
  rx: 'RX',
  gx: 'GX',
  'ls 430': 'LS 430',
  'ls 400': 'LS 400',
  'ls 460': 'LS 460',
  'lx 570': 'LX 570',
  'lx 470': 'LX 470',
  'rx 350': 'RX 350',
  'gx 460': 'GX 460',
  'es 350': 'ES 350',
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

const ARABIC_MARKETS: Record<string, string> = {
  japan: 'ياباني',
  'japan domestic': 'وارد ياباني',
  jdm: 'وارد ياباني',
  usa: 'وارد أمريكي',
  us: 'وارد أمريكي',
  gcc: 'خليجي',
  gulf: 'خليجي',
  'middle east': 'خليجي',
  korea: 'كوري',
  korean: 'كوري',
  'korea domestic': 'وارد كوري',
  europe: 'وارد أوروبي',
  canada: 'وارد كندي',
  australia: 'وارد أسترالي',
};

/* ── Small label helpers (each stays under the complexity-10 ceiling) ── */

const lookupArabic = (record: Record<string, string>, key: string): string | undefined =>
  Object.entries(record).find(([k]) => k === key)?.[1];

const orUndefined = (s: string): string | undefined => (s === '' ? undefined : s);

const isValidNumeric = (s: string): boolean => {
  if (s.length === 0) return false;
  let seenDot = false;
  for (const ch of s) {
    if (ch === '.') {
      if (seenDot) return false;
      seenDot = true;
    } else if (ch < '0' || ch > '9') {
      return false;
    }
  }
  return true;
};

const arabicTransmission = (transmission?: string | null): string => {
  if (transmission == null || transmission === '') return '';
  const t = transmission.toLowerCase();
  if (/auto|تماتيك|أوتوماتيك/i.test(t)) return 'تماتيك';
  if (/manual|عادي|يدوي|مانيوال/i.test(t)) return 'عادي';
  return transLabel(transmission);
};

const arabicDrive = (driveType?: string | null): string => {
  if (driveType == null || driveType === '') return '';
  const d = driveType.toLowerCase();
  if (/4wd|4x4|دبل/i.test(d)) return 'دبل';
  if (/awd/i.test(d)) return 'دبل مستمر';
  return '';
};

const safeSubmodel = (submodel: string | null | undefined, modelAr: string): string => {
  if (submodel == null || submodel === '') return '';
  const s = submodel.trim();
  if (s.length > 15) return '';
  if (modelAr.toLowerCase().includes(s.toLowerCase())) return '';
  return s;
};

const ARABIC_KEYWORD_MATCHES: Array<[RegExp, string]> = [
  [/بلاك|بوج|شمع/i, 'بلاكات'],
  [/فحم|سفايف|قماش/i, 'فحمات فرامل'],
  [/فلتر.*زيت|سيفون/i, 'فلتر زيت'],
  [/فلتر.*هواء/i, 'فلتر هواء'],
  [/فلتر.*مكيف/i, 'فلتر مكيف'],
  [/مساعد|جامبين/i, 'مساعدات'],
  [/طرمب.*بنزين|فيول/i, 'طرمبة بنزين'],
  [/طرمب.*ماء|طلمب/i, 'طرمبة ماء'],
  [/سير.*تايمن|كاتين/i, 'سير تايمن'],
  [/سير.*مكين/i, 'سير مكينة'],
  [/سلف|مارش/i, 'سلف'],
  [/دينمو/i, 'دينمو'],
  [/رديتر|راديات/i, 'رديتر'],
  [/كلتش|دبرياج|دزك/i, 'صحن كلتش'],
];

const lookupDictionaryTerm = (q: string): string | null => {
  for (const [key, val] of Object.entries(AUTO_PARTS_DICTIONARY)) {
    if (q.includes(key) || key.includes(q)) return val.primary;
    for (const syn of val.synonyms) {
      if (q.includes(syn.toLowerCase())) return val.primary;
    }
  }
  return null;
};

/**
 * Normalizes and extracts Arabic car model & make.
 */
export function getArabicVehicleName(vehicle?: VehicleInfo | null): {
  makeAr: string;
  modelAr: string;
} {
  if (vehicle == null) return { makeAr: '', modelAr: '' };
  const rawMake = vehicle.make.toLowerCase().trim();
  const rawModel = (vehicle.model ?? '').toLowerCase().trim();

  const makeAr = lookupArabic(ARABIC_MAKES, rawMake) ?? vehicle.make;
  const modelAr = lookupArabic(ARABIC_MODELS, rawModel) ?? vehicle.model ?? '';

  return { makeAr, modelAr };
}

/**
 * Finds Arabic term for a given part query (English name, OEM category, or Arabic term).
 */
export function findArabicPartTerm(query: string): string {
  const q = query.toLowerCase().trim();
  if (!q) return '';

  const dictHit = lookupDictionaryTerm(q);
  if (dictHit != null) return dictHit;

  // Common Arabic keywords directly
  for (const [re, result] of ARABIC_KEYWORD_MATCHES) {
    if (re.test(q)) return result;
  }

  return query.trim();
}

/**
 * Builds standard years string (e.g., "2001-2007" or "2001").
 */
export function formatVehicleYears(vehicle?: VehicleInfo | null): string {
  if (vehicle == null) return '';
  const yStart = vehicle.yearStart ?? vehicle.year;
  const yEnd = vehicle.yearEnd;

  if (yStart != null && yEnd != null && yStart !== yEnd) {
    return `${String(yStart)}-${String(yEnd)}`;
  }
  if (yStart != null) {
    return String(yStart);
  }
  return '';
}

/**
 * Builds smart engine specification label (e.g., "مكينة 1.8" or "1800cc").
 */
export function formatEngineSpec(vehicle?: VehicleInfo | null): string {
  if (vehicle == null) return '';
  if (vehicle.displacement != null && vehicle.displacement !== '') {
    const cleanDisplacement = vehicle.displacement.replace(/L$/i, '').trim();
    const d = parseFloat(cleanDisplacement);
    if (!Number.isNaN(d)) return `مكينة ${String(d)}`;
  }
  if (vehicle.engine != null && vehicle.engine !== '') {
    const e = vehicle.engine.replace(/L$/i, '').trim();
    if (isValidNumeric(e)) {
      return `مكينة ${e}`;
    }
    return e;
  }
  return '';
}

/**
 * Normalizes market/region to standard Arabic label.
 */
export function formatMarketLabel(rawMarket?: string | null): string {
  if (rawMarket == null || rawMarket === '') return '';
  const lower = rawMarket.toLowerCase().trim();
  return lookupArabic(ARABIC_MARKETS, lower) ?? rawMarket.trim();
}

/**
 * Builds the default smart Arabic vehicle suffix (e.g., "فيتز 2005 مكينة 1.3").
 */
export function buildDefaultVehicleArabicSuffix(vehicle?: VehicleInfo | null): string {
  if (vehicle == null) return '';
  const { modelAr } = getArabicVehicleName(vehicle);
  const years = formatVehicleYears(vehicle);
  const engine = formatEngineSpec(vehicle);
  const market = formatMarketLabel(vehicle.market ?? vehicle.region);
  const trans = arabicTransmission(vehicle.transmission);
  const drive = arabicDrive(vehicle.driveType);
  const submodel = safeSubmodel(vehicle.submodel, modelAr);

  const parts: Array<string | undefined> = [
    orUndefined(modelAr),
    orUndefined(submodel),
    orUndefined(years),
    market !== '' && market !== 'ياباني' ? market : undefined,
    orUndefined(trans),
    orUndefined(drive),
    orUndefined(engine),
  ];

  return parts.filter((p): p is string => p != null && p !== '').join(' ');
}

/**
 * Generates the full, consistent Arabic product name combining part name and car specs.
 * Example output: "بلاكات فيتز 2005 مكينة 1.3" or "بلاكات كورولا 2001-2007 خليجي تماتيك مكينة 1.8"
 */
// eslint-disable-next-line complexity -- intentional branching while assembling the smart Arabic product name.
export function generateSmartPartName(
  partQuery: string,
  vehicle?: VehicleInfo | null,
  options?: {
    includeMake?: boolean | undefined;
    includeEngine?: boolean | undefined;
    includeTrans?: boolean | undefined;
    includeMarket?: boolean | undefined;
    customVehicleTemplate?: string | undefined;
  }
): string {
  const partName = findArabicPartTerm(partQuery) || partQuery.trim() || 'قطعة غيار';

  // If user provided an explicit custom vehicle template (e.g., "فيتز 2005 مكينة 1.3"), use it directly!
  const customTemplate = options?.customVehicleTemplate?.trim() ?? '';
  if (customTemplate !== '') {
    return `${partName} ${customTemplate}`;
  }

  if (vehicle == null) return partName;

  const opts = {
    includeMake: false,
    includeEngine: true,
    includeTrans: true,
    includeMarket: true,
    ...options,
  };

  const { makeAr, modelAr } = getArabicVehicleName(vehicle);
  const years = formatVehicleYears(vehicle);
  const engine = opts.includeEngine === true ? formatEngineSpec(vehicle) : '';
  const market =
    opts.includeMarket === true ? formatMarketLabel(vehicle.market ?? vehicle.region) : '';
  const trans = opts.includeTrans === true ? arabicTransmission(vehicle.transmission) : '';
  const drive = arabicDrive(vehicle.driveType);
  const submodel = safeSubmodel(vehicle.submodel, modelAr);

  const parts: Array<string | undefined> = [
    partName,
    opts.includeMake === true && makeAr && !modelAr.includes(makeAr) ? makeAr : undefined,
    orUndefined(modelAr),
    orUndefined(submodel),
    orUndefined(years),
    orUndefined(market),
    orUndefined(trans),
    orUndefined(drive),
    orUndefined(engine),
  ];

  return parts.filter((p): p is string => p != null && p !== '').join(' ');
}
