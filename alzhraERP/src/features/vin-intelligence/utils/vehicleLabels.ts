/**
 * Shared Arabic display labels for vehicle attributes.
 * Single source of truth for fuel / drive / transmission / body / region localization
 * (used by VinDecodeTab, VinsTab, and SmartPartNamer).
 */

const FUEL_LABELS: Array<[string[], string]> = [
  [['diesel'], 'ديزل'],
  [['gasoline', 'petrol', 'gas'], 'بترول'],
  [['plug-in', 'phev'], 'هجين قابل للشحن (Plug-in)'],
  [['hybrid'], 'هجين (هايبرد)'],
  [['electric', 'ev'], 'كهرباء بالكامل (EV)'],
  [['flex', 'ffv'], 'وقود مرن (Flex-Fuel)'],
  [['cng'], 'غاز طبيعي'],
];

const BODY_LABELS: Array<[string[], string]> = [
  [['sedan'], 'سيدان (صالون)'],
  [['sport utility', 'suv', 'crossover', 'mpv'], 'جيب / فورويل (SUV)'],
  [['pickup', 'truck'], 'حوض / بيك آب (Pickup)'],
  [['hatchback'], 'هاتشباك'],
  [['coupe'], 'كوبيه (بابين)'],
  [['convertible', 'cabriolet'], 'كشف (Convertible)'],
  [['van', 'minivan'], 'فان / باص'],
  [['wagon'], 'ستيشن واجن'],
];

const REGION_LABELS: Array<[string[], string]> = [
  [['united states', 'usa'], 'أمريكا (USA)'],
  [['japan'], 'اليابان'],
  [['korea'], 'كوريا الجنوبية'],
  [['germany'], 'ألمانيا'],
  [['canada'], 'كندا'],
  [['mexico'], 'المكسيك'],
  [['china'], 'الصين'],
  [['thailand'], 'تايلاند'],
  [['united kingdom', 'uk'], 'بريطانيا'],
  [['australia'], 'أستراليا'],
  [['brazil'], 'البرازيل'],
  [['taiwan'], 'تايوان'],
  [['turkey'], 'تركيا'],
];

const firstKeywordLabel = (s: string, table: Array<[string[], string]>): string | null => {
  for (const [keywords, label] of table) {
    for (const kw of keywords) {
      if (s.includes(kw)) return label;
    }
  }
  return null;
};

export const fuelLabel = (f: string): string => {
  const s = f.toLowerCase();
  return firstKeywordLabel(s, FUEL_LABELS) ?? f;
};

export const driveLabel = (d: string): string => {
  const s = d.toLowerCase();
  if (/4wd|4x4|four.wheel/i.test(s)) return 'دبل (4x4)';
  if (/awd|all.wheel/i.test(s)) return 'دبل مستمر (AWD)';
  if (/fwd|front/i.test(s)) return 'سنجل أمامي (FWD)';
  if (/rwd|rear/i.test(s)) return 'سنجل خلفي (RWD)';
  if (/2wd|4x2/i.test(s)) return 'سنجل (2WD)';
  return d;
};

export const transLabel = (t: string): string => {
  const s = t.toLowerCase();
  if (/cvt/i.test(s)) return 'أوتوماتيك (CVT)';
  if (/dual.clutch|dct|dsg/i.test(s)) return 'دبل كلتش (DCT)';
  if (/auto/i.test(s)) return 'تماتيك (أوتوماتيك)';
  if (/manual/i.test(s)) return 'عادي (مانيوال)';
  return t;
};

export const bodyTypeLabel = (b: string): string => {
  const s = b.toLowerCase();
  return firstKeywordLabel(s, BODY_LABELS) ?? b;
};

export const regionLabel = (r: string): string => {
  const s = r.toLowerCase();
  return firstKeywordLabel(s, REGION_LABELS) ?? r;
};
