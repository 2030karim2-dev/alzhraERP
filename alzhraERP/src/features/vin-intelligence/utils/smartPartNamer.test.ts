import { describe, it, expect } from 'vitest';
import { generateSmartPartName, findArabicPartTerm } from './smartPartNamer';
import type { VehicleInfo } from '../types';

describe('smartPartNamer', () => {
  it('translates English part names to Arabic automotive terms', () => {
    expect(findArabicPartTerm('spark plug')).toBe('بلاكات');
    expect(findArabicPartTerm('PLUG, SPARK')).toBe('بلاكات');
    expect(findArabicPartTerm('brake pad')).toBe('فحمات فرامل');
    expect(findArabicPartTerm('oil filter')).toBe('فلتر زيت');
    expect(findArabicPartTerm('alternator')).toBe('دينمو');
    expect(findArabicPartTerm('starter')).toBe('سلف');
    expect(findArabicPartTerm('radiator')).toBe('رديتر');
    expect(findArabicPartTerm('cv axle')).toBe('عكوس');
    expect(findArabicPartTerm('ignition coil')).toBe('كويلات');
  });

  it('generates full Arabic product name with vehicle specs for Corolla', () => {
    const vehicle: VehicleInfo = {
      make: 'Toyota',
      model: 'Corolla',
      yearStart: 2001,
      yearEnd: 2007,
      market: 'خليجي',
      transmission: 'automatic',
      displacement: '1.8',
    };

    const name = generateSmartPartName('spark plug', vehicle);
    expect(name).toBe('بلاكات كورولا 2001-2007 خليجي تماتيك مكينة 1.8');
  });

  it('generates full Arabic product name for Hilux and Shas', () => {
    const hilux: VehicleInfo = {
      make: 'Toyota',
      model: 'Hilux',
      yearStart: 2006,
      yearEnd: 2015,
      market: 'خليجي',
      transmission: 'manual',
      displacement: '2.7',
    };
    expect(generateSmartPartName('brake pad', hilux)).toBe('فحمات فرامل هايلوكس 2006-2015 خليجي عادي مكينة 2.7');

    const shas: VehicleInfo = {
      make: 'Toyota',
      model: 'shas',
      yearStart: 2010,
      yearEnd: 2022,
      market: 'خليجي',
      transmission: 'manual',
      displacement: '4.0',
    };
    expect(generateSmartPartName('shock absorber', shas)).toBe('مساعدات شاص 2010-2022 خليجي عادي مكينة 4');
  });

  it('handles manual Arabic part input like بواجي or بلاكات', () => {
    const vehicle: VehicleInfo = {
      make: 'تويوتا',
      model: 'كرولا',
      year: 2001,
      yearEnd: 2007,
      market: 'خليجي',
      transmission: 'أوتوماتيك',
    };

    const name = generateSmartPartName('بلاكات', vehicle, { includeEngine: false });
    expect(name).toBe('بلاكات كرولا 2001-2007 خليجي تماتيك');
  });
});
