/**
 * Shared Arabic display labels for vehicle attributes.
 * Single source of truth for fuel / drive / transmission localization
 * (used by VinDecodeTab and VinsTab).
 */

export const fuelLabel = (f: string): string => {
  const s = f.toLowerCase();
  if (s.includes('diesel')) return 'ديزل';
  if (s.includes('gasoline') || s.includes('petrol') || s.includes('gas')) return 'بترول';
  if (s.includes('electric')) return 'كهرباء';
  if (s.includes('hybrid')) return 'هجين';
  return f;
};

export const driveLabel = (d: string): string => {
  if (/4wd|awd|4x4|all.wheel/i.test(d)) return 'دبل';
  if (/2wd|4x2|front|rear|fwd|rwd/i.test(d)) return 'سنجل';
  return d;
};

export const transLabel = (t: string): string => {
  if (/auto/i.test(t)) return 'أوتوماتيك';
  if (/manual/i.test(t)) return 'عادي';
  return t;
};
