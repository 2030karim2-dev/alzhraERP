import { describe, it, expect } from 'vitest';
import { generateSmartPartName, findArabicPartTerm } from './smartPartNamer';
import type { VehicleInfo } from '../types';

describe('smartPartNamer', () => {
  it('translates English part names to Arabic automotive terms', () => {
    expect(findArabicPartTerm('spark plug')).toBe('بلاكات');
    expect(findArabicPartTerm('PLUG, SPARK')).toBe('بلاكات');
    expect(findArabicPartTerm('brake pad')).toBe('فحمات فرامل');
    expect(findArabicPartTerm('oil filter')).toBe('فلتر زيت');
    expect(findArabicPartTerm('shock absorber')).toBe('مساعدات');
  });

  it('generates full Arabic product name with vehicle specs', () => {
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
