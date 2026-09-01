import { describe, it, expect } from 'vitest';
import {
  pickBaseName,
  pickManufacturer,
  pickPrice,
  pickPartName,
  pickAltManufacturer,
  buildFinalDescription,
} from './vinRowHelpers';
import type { VehicleInfo, PartAlternative, PartIntelligenceResult } from '../types';

const vehicle: VehicleInfo = { make: 'Toyota', model: 'Corolla' };

describe('pickBaseName', () => {
  it('prefers baseName over description', () => {
    expect(pickBaseName({ baseName: 'بلاكات', description: 'قديم' })).toBe('بلاكات');
  });

  it('falls back to description', () => {
    expect(pickBaseName({ description: 'فحمات' })).toBe('فحمات');
  });

  it('returns empty string when neither is present', () => {
    expect(pickBaseName({})).toBe('');
  });
});

describe('pickManufacturer', () => {
  it('prefers the explicit manufacturer', () => {
    expect(pickManufacturer({ manufacturer: 'GENUINE' }, vehicle)).toBe('GENUINE');
  });

  it('falls back to the vehicle make', () => {
    expect(pickManufacturer({}, vehicle)).toBe('Toyota');
  });

  it('returns empty when nothing is available', () => {
    expect(pickManufacturer({}, null)).toBe('');
  });
});

describe('pickPrice', () => {
  it('returns the value when defined', () => {
    expect(pickPrice(42.5)).toBe(42.5);
  });

  it('defaults to 0', () => {
    expect(pickPrice(undefined)).toBe(0);
  });
});

describe('pickPartName', () => {
  it('prefers description over part number', () => {
    expect(pickPartName({ description: 'مرشح زيت', partNumber: 'OIL-1' })).toBe('مرشح زيت');
  });

  it('falls back to part number', () => {
    expect(pickPartName({ partNumber: 'OIL-1' })).toBe('OIL-1');
  });
});

describe('pickAltManufacturer', () => {
  const intel: PartIntelligenceResult = {
    partNumber: '90919-02260',
    manufacturer: 'DENSO',
    primaryNameAr: 'بواجي',
    primaryNameEn: 'Spark Plug',
    categoryAr: 'نظام الإشعال',
    categoryEn: 'Ignition',
    confidence: 'high',
    confidenceScore: 95,
    confidenceReason: 'oem',
    source: 'catalog',
    alternatives: [],
    compatibleVehicles: [],
    specs: {},
  };

  it('prefers the alternative brand', () => {
    const alt: PartAlternative = { partNumber: 'X', brand: 'BOSCH' };
    expect(pickAltManufacturer(alt, intel, vehicle)).toBe('BOSCH');
  });

  it('falls back to intelligence manufacturer', () => {
    const alt: PartAlternative = { partNumber: 'X' };
    expect(pickAltManufacturer(alt, intel, vehicle)).toBe('DENSO');
  });

  it('falls back to vehicle make', () => {
    const alt: PartAlternative = { partNumber: 'X' };
    expect(pickAltManufacturer(alt, null, vehicle)).toBe('Toyota');
  });
});

describe('buildFinalDescription', () => {
  it('appends the size spec when it adds information', () => {
    expect(
      buildFinalDescription({ baseName: 'بلاكات', description: 'بلاكات', sizeSpec: 'طقم 4' })
    ).toBe('بلاكات - طقم 4');
  });

  it('does not duplicate the size spec', () => {
    expect(
      buildFinalDescription({
        baseName: 'بلاكات',
        description: 'بلاكات - طقم 4',
        sizeSpec: 'طقم 4',
      })
    ).toBe('بلاكات - طقم 4');
  });

  it('falls back to baseName when description is empty', () => {
    expect(buildFinalDescription({ baseName: 'بلاكات', description: '' })).toBe('بلاكات');
  });

  it('defaults to قطعة غيار', () => {
    expect(buildFinalDescription({ baseName: '', description: '' })).toBe('قطعة غيار');
  });
});
