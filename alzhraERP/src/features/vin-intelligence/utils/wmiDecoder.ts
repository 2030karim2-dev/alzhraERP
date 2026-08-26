/**
 * Instant Client-Side WMI (World Manufacturer Identifier) & Model Year Decoder
 * Decodes country, manufacturer, and model year instantly (0ms) without network.
 */

export interface WmiInfo {
  make: string;
  makeAr: string;
  country: string;
  countryAr: string;
  year?: number | null;
  wmi: string;
}

const WMI_MAP: Record<
  string,
  { make: string; makeAr: string; country: string; countryAr: string }
> = {
  // Toyota / Lexus
  JTD: { make: 'Toyota', makeAr: 'تويوتا', country: 'Japan', countryAr: 'اليابان' },
  JTE: { make: 'Toyota', makeAr: 'تويوتا', country: 'Japan', countryAr: 'اليابان' },
  JTM: { make: 'Toyota', makeAr: 'تويوتا', country: 'Japan', countryAr: 'اليابان' },
  JTN: { make: 'Toyota', makeAr: 'تويوتا', country: 'Japan', countryAr: 'اليابان' },
  JT2: { make: 'Toyota', makeAr: 'تويوتا', country: 'Japan', countryAr: 'اليابان' },
  JT3: { make: 'Toyota', makeAr: 'تويوتا', country: 'Japan', countryAr: 'اليابان' },
  JT4: { make: 'Toyota', makeAr: 'تويوتا', country: 'Japan', countryAr: 'اليابان' },
  JT5: { make: 'Toyota', makeAr: 'تويوتا', country: 'Japan', countryAr: 'اليابان' },
  JTH: { make: 'Lexus', makeAr: 'لكزس', country: 'Japan', countryAr: 'اليابان' },
  JTJ: { make: 'Lexus', makeAr: 'لكزس', country: 'Japan', countryAr: 'اليابان' },
  '4T1': { make: 'Toyota', makeAr: 'تويوتا', country: 'USA', countryAr: 'أمريكا' },
  '4T3': { make: 'Toyota', makeAr: 'تويوتا', country: 'USA', countryAr: 'أمريكا' },
  '4T4': { make: 'Toyota', makeAr: 'تويوتا', country: 'USA', countryAr: 'أمريكا' },
  '5TD': { make: 'Toyota', makeAr: 'تويوتا', country: 'USA', countryAr: 'أمريكا' },
  '5TF': { make: 'Toyota', makeAr: 'تويوتا', country: 'USA', countryAr: 'أمريكا' },
  '2T1': { make: 'Toyota', makeAr: 'تويوتا', country: 'Canada', countryAr: 'كندا' },
  '3TM': { make: 'Toyota', makeAr: 'تويوتا', country: 'Mexico', countryAr: 'المكسيك' },
  MR0: { make: 'Toyota', makeAr: 'تويوتا', country: 'Thailand', countryAr: 'تايلاند' },
  MHF: { make: 'Toyota', makeAr: 'تويوتا', country: 'Indonesia', countryAr: 'إندونيسيا' },
  AHT: { make: 'Toyota', makeAr: 'تويوتا', country: 'South Africa', countryAr: 'جنوب أفريقيا' },

  // Hyundai / Genesis / Kia
  KM8: { make: 'Hyundai', makeAr: 'هيونداي', country: 'South Korea', countryAr: 'كوريا الجنوبية' },
  KMH: { make: 'Hyundai', makeAr: 'هيونداي', country: 'South Korea', countryAr: 'كوريا الجنوبية' },
  KMF: { make: 'Hyundai', makeAr: 'هيونداي', country: 'South Korea', countryAr: 'كوريا الجنوبية' },
  KMT: { make: 'Genesis', makeAr: 'جينيسيس', country: 'South Korea', countryAr: 'كوريا الجنوبية' },
  '5NP': { make: 'Hyundai', makeAr: 'هيونداي', country: 'USA', countryAr: 'أمريكا' },
  '5NM': { make: 'Hyundai', makeAr: 'هيونداي', country: 'USA', countryAr: 'أمريكا' },
  KNA: { make: 'Kia', makeAr: 'كيا', country: 'South Korea', countryAr: 'كوريا الجنوبية' },
  KND: { make: 'Kia', makeAr: 'كيا', country: 'South Korea', countryAr: 'كوريا الجنوبية' },
  KNM: { make: 'Kia', makeAr: 'كيا', country: 'South Korea', countryAr: 'كوريا الجنوبية' },
  '5XX': { make: 'Kia', makeAr: 'كيا', country: 'USA', countryAr: 'أمريكا' },

  // Nissan / Infiniti
  JN1: { make: 'Nissan', makeAr: 'نيسان', country: 'Japan', countryAr: 'اليابان' },
  JN6: { make: 'Nissan', makeAr: 'نيسان', country: 'Japan', countryAr: 'اليابان' },
  JN8: { make: 'Nissan', makeAr: 'نيسان', country: 'Japan', countryAr: 'اليابان' },
  JNK: { make: 'Infiniti', makeAr: 'إنفينيتي', country: 'Japan', countryAr: 'اليابان' },
  JNR: { make: 'Infiniti', makeAr: 'إنفينيتي', country: 'Japan', countryAr: 'اليابان' },
  '1N4': { make: 'Nissan', makeAr: 'نيسان', country: 'USA', countryAr: 'أمريكا' },
  '1N6': { make: 'Nissan', makeAr: 'نيسان', country: 'USA', countryAr: 'أمريكا' },
  '3N1': { make: 'Nissan', makeAr: 'نيسان', country: 'Mexico', countryAr: 'المكسيك' },
  MNT: { make: 'Nissan', makeAr: 'نيسان', country: 'Thailand', countryAr: 'تايلاند' },

  // Honda / Acura
  JHM: { make: 'Honda', makeAr: 'هوندا', country: 'Japan', countryAr: 'اليابان' },
  JHL: { make: 'Honda', makeAr: 'هوندا', country: 'Japan', countryAr: 'اليابان' },
  '1HG': { make: 'Honda', makeAr: 'هوندا', country: 'USA', countryAr: 'أمريكا' },
  '2HG': { make: 'Honda', makeAr: 'هوندا', country: 'Canada', countryAr: 'كندا' },
  '3HG': { make: 'Honda', makeAr: 'هوندا', country: 'Mexico', countryAr: 'المكسيك' },

  // GM / Chevrolet / GMC
  '1G1': { make: 'Chevrolet', makeAr: 'شفروليه', country: 'USA', countryAr: 'أمريكا' },
  '1GC': { make: 'Chevrolet', makeAr: 'شفروليه', country: 'USA', countryAr: 'أمريكا' },
  '1GN': { make: 'Chevrolet', makeAr: 'شفروليه', country: 'USA', countryAr: 'أمريكا' },
  '1GT': { make: 'GMC', makeAr: 'جمس', country: 'USA', countryAr: 'أمريكا' },
  '1GK': { make: 'GMC', makeAr: 'جمس', country: 'USA', countryAr: 'أمريكا' },
  '3GC': { make: 'Chevrolet', makeAr: 'شفروليه', country: 'Mexico', countryAr: 'المكسيك' },
  '3GT': { make: 'GMC', makeAr: 'جمس', country: 'Mexico', countryAr: 'المكسيك' },

  // Ford
  '1FA': { make: 'Ford', makeAr: 'فورد', country: 'USA', countryAr: 'أمريكا' },
  '1FB': { make: 'Ford', makeAr: 'فورد', country: 'USA', countryAr: 'أمريكا' },
  '1FM': { make: 'Ford', makeAr: 'فورد', country: 'USA', countryAr: 'أمريكا' },
  '1FT': { make: 'Ford', makeAr: 'فورد', country: 'USA', countryAr: 'أمريكا' },
  '2FM': { make: 'Ford', makeAr: 'فورد', country: 'Canada', countryAr: 'كندا' },
  '3FA': { make: 'Ford', makeAr: 'فورد', country: 'Mexico', countryAr: 'المكسيك' },
  MNB: { make: 'Ford', makeAr: 'فورد', country: 'Thailand', countryAr: 'تايلاند' },

  // Isuzu / Mitsubishi / Mazda / Suzuki
  MPA: { make: 'Isuzu', makeAr: 'إيسوزو', country: 'Thailand', countryAr: 'تايلاند' },
  JAA: { make: 'Isuzu', makeAr: 'إيسوزو', country: 'Japan', countryAr: 'اليابان' },
  JA3: { make: 'Mitsubishi', makeAr: 'ميتسوبيشي', country: 'Japan', countryAr: 'اليابان' },
  MMB: { make: 'Mitsubishi', makeAr: 'ميتسوبيشي', country: 'Thailand', countryAr: 'تايلاند' },
  JM1: { make: 'Mazda', makeAr: 'مازدا', country: 'Japan', countryAr: 'اليابان' },
  JM7: { make: 'Mazda', makeAr: 'مازدا', country: 'Japan', countryAr: 'اليابان' },
  JS2: { make: 'Suzuki', makeAr: 'سوزوكي', country: 'Japan', countryAr: 'اليابان' },
  MA3: { make: 'Suzuki', makeAr: 'سوزوكي', country: 'India', countryAr: 'الهند' },

  // German: Mercedes / BMW / VW / Audi
  WDB: { make: 'Mercedes-Benz', makeAr: 'مرسيدس', country: 'Germany', countryAr: 'ألمانيا' },
  WDC: { make: 'Mercedes-Benz', makeAr: 'مرسيدس', country: 'Germany', countryAr: 'ألمانيا' },
  WDD: { make: 'Mercedes-Benz', makeAr: 'مرسيدس', country: 'Germany', countryAr: 'ألمانيا' },
  WBA: { make: 'BMW', makeAr: 'بي إم دبليو', country: 'Germany', countryAr: 'ألمانيا' },
  WBS: { make: 'BMW', makeAr: 'بي إم دبليو', country: 'Germany', countryAr: 'ألمانيا' },
  '5UX': { make: 'BMW', makeAr: 'بي إم دبليو', country: 'USA', countryAr: 'أمريكا' },
  WVW: { make: 'Volkswagen', makeAr: 'فولكس فاجن', country: 'Germany', countryAr: 'ألمانيا' },
  WAU: { make: 'Audi', makeAr: 'أودي', country: 'Germany', countryAr: 'ألمانيا' },
};

/** ISO 3779 Model Year character map (10th character of 17-char VIN) */
const YEAR_MAP: Record<string, number> = {
  Y: 2000,
  '1': 2001,
  '2': 2002,
  '3': 2003,
  '4': 2004,
  '5': 2005,
  '6': 2006,
  '7': 2007,
  '8': 2008,
  '9': 2009,
  A: 2010,
  B: 2011,
  C: 2012,
  D: 2013,
  E: 2014,
  F: 2015,
  G: 2016,
  H: 2017,
  J: 2018,
  K: 2019,
  L: 2020,
  M: 2021,
  N: 2022,
  P: 2023,
  R: 2024,
  S: 2025,
  T: 2026,
  V: 2027,
  W: 2028,
  X: 2029,
};

/**
 * Resolves the ISO 3779 model-year character into a concrete year using
 * the standard 30-year cycle window (chars recur every 30 model years).
 * Without position-specific info we pick the LATEST candidate within
 * the plausible future (`nowYear + 1`) so freshly-built vehicles roll
 * forward automatically once their letter cycles around.
 * `nowYear` is injectable for deterministic unit tests.
 */
export function resolveModelYear(
  ch: string,
  nowYear: number = new Date().getFullYear()
): number | null {
  // Index access widens through a cast so the `typeof` guard below stays
  // meaningful under strict-boolean / no-unnecessary-condition rules.
  const mapped = YEAR_MAP[ch.toUpperCase()] as number | undefined;
  if (typeof mapped !== 'number') return null;
  let best = mapped;
  let candidate = mapped + 30;
  while (candidate <= nowYear + 1) {
    best = candidate;
    candidate += 30;
  }
  return best;
}

const COUNTRY_BY_PREFIX: Array<[string, string]> = [
  ['145', 'أمريكا'],
  ['2', 'كندا'],
  ['3', 'المكسيك'],
  ['J', 'اليابان'],
  ['K', 'كوريا الجنوبية'],
  ['L', 'الصين'],
  ['STUVWXYZ', 'أوروبا'],
  ['67', 'أستراليا'],
  ['M', 'آسيا / تايلاند'],
];

const countryFromPrefix = (c1: string): string => {
  for (const [prefix, label] of COUNTRY_BY_PREFIX) {
    if (prefix.includes(c1)) return label;
  }
  return 'غير محدد';
};

/**
 * Fast client-side VIN pre-decoding (instant WMI + Year).
 * Model-year resolution uses resolveModelYear() (see above).
 */
export function preDecodeVin(vinInput: string): WmiInfo | null {
  const clean = vinInput.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 3) return null;

  const wmi = clean.slice(0, 3);
  const match = Object.entries(WMI_MAP).find(([k]) => k === wmi)?.[1];

  let year: number | null = null;
  if (clean.length >= 10) {
    year = resolveModelYear(clean[9]);
  }

  if (match != null) {
    return {
      wmi,
      make: match.make,
      makeAr: match.makeAr,
      country: match.country,
      countryAr: match.countryAr,
      year,
    };
  }

  // Country fallback based on 1st character
  const c1 = clean[0];
  const fallbackCountry = countryFromPrefix(c1);

  return {
    wmi,
    make: 'غير محدد',
    makeAr: 'غير محدد',
    country: fallbackCountry,
    countryAr: fallbackCountry,
    year,
  };
}
