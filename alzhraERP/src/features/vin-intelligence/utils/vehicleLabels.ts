/**
 * Shared Arabic display labels for vehicle attributes.
 * Single source of truth for fuel / drive / transmission / body / region localization
 * (used by VinDecodeTab, VinsTab, and SmartPartNamer).
 */

export const fuelLabel = (f: string): string => {
  const s = f.toLowerCase();
  if (s.includes('diesel')) return 'ديزل';
  if (s.includes('gasoline') || s.includes('petrol') || s.includes('gas')) return 'بترول';
  if (s.includes('plug-in') || s.includes('phev')) return 'هجين قابل للشحن (Plug-in)';
  if (s.includes('hybrid')) return 'هجين (هايبرد)';
  if (s.includes('electric') || s.includes('ev')) return 'كهرباء بالكامل (EV)';
  if (s.includes('flex') || s.includes('ffv')) return 'وقود مرن (Flex-Fuel)';
  if (s.includes('cng') || s.includes('gas')) return 'غاز طبيعي';
  return f;
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
  if (s.includes('sedan')) return 'سيدان (صالون)';
  if (s.includes('sport utility') || s.includes('suv') || s.includes('crossover') || s.includes('mpv')) return 'جيب / فورويل (SUV)';
  if (s.includes('pickup') || s.includes('truck')) return 'حوض / بيك آب (Pickup)';
  if (s.includes('hatchback')) return 'هاتشباك';
  if (s.includes('coupe')) return 'كوبيه (بابين)';
  if (s.includes('convertible') || s.includes('cabriolet')) return 'كشف (Convertible)';
  if (s.includes('van') || s.includes('minivan')) return 'فان / باص';
  if (s.includes('wagon')) return 'ستيشن واجن';
  return b;
};

export const regionLabel = (r: string): string => {
  const s = r.toLowerCase();
  if (s.includes('united states') || s.includes('usa')) return 'أمريكا (USA)';
  if (s.includes('japan')) return 'اليابان';
  if (s.includes('korea')) return 'كوريا الجنوبية';
  if (s.includes('germany')) return 'ألمانيا';
  if (s.includes('canada')) return 'كندا';
  if (s.includes('mexico')) return 'المكسيك';
  if (s.includes('china')) return 'الصين';
  if (s.includes('thailand')) return 'تايلاند';
  if (s.includes('united kingdom') || s.includes('uk')) return 'بريطانيا';
  if (s.includes('australia')) return 'أستراليا';
  if (s.includes('brazil')) return 'البرازيل';
  if (s.includes('taiwan')) return 'تايوان';
  if (s.includes('turkey')) return 'تركيا';
  return r;
};
