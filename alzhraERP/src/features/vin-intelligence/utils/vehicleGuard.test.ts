import { describe, it, expect } from 'vitest';
import { isValidVehicleInfo, safeParseVehicleInfo } from './vehicleGuard';

describe('isValidVehicleInfo', () => {
  it('accepts a minimal valid record', () => {
    expect(isValidVehicleInfo({ make: 'Toyota' })).toBe(true);
  });

  it('rejects null/undefined/primitives', () => {
    expect(isValidVehicleInfo(null)).toBe(false);
    expect(isValidVehicleInfo(undefined)).toBe(false);
    expect(isValidVehicleInfo('Toyota')).toBe(false);
    expect(isValidVehicleInfo(42)).toBe(false);
    expect(isValidVehicleInfo([])).toBe(false);
  });

  it('rejects empty make', () => {
    expect(isValidVehicleInfo({ make: '' })).toBe(false);
    expect(isValidVehicleInfo({ make: '   ' })).toBe(false);
  });

  it('rejects missing make', () => {
    expect(isValidVehicleInfo({ model: 'Corolla' })).toBe(false);
  });

  it('rejects wrong types in optional string fields', () => {
    expect(isValidVehicleInfo({ make: 'Toyota', model: 123 })).toBe(false);
    expect(isValidVehicleInfo({ make: 'Toyota', driveType: ['4WD'] })).toBe(false);
  });

  it('rejects wrong types in optional number fields', () => {
    expect(isValidVehicleInfo({ make: 'Toyota', year: '2020' })).toBe(false);
    expect(isValidVehicleInfo({ make: 'Toyota', yearStart: null })).toBe(true);
  });

  it('accepts full VehicleInfo', () => {
    const v = {
      make: 'Toyota',
      model: 'Corolla',
      submodel: 'GLI',
      trim: 'XLI',
      year: 2020,
      yearStart: 2018,
      yearEnd: 2022,
      engine: '1.6L',
      bodyType: 'sedan',
      driveType: 'FWD',
      fuelType: 'gasoline',
      transmission: 'automatic',
      market: 'gcc',
      vinPrefix: 'JTD',
    };
    expect(isValidVehicleInfo(v)).toBe(true);
  });
});

describe('safeParseVehicleInfo', () => {
  it('returns the value when valid', () => {
    const v = { make: 'Toyota' };
    expect(safeParseVehicleInfo(v)).toEqual(v);
  });

  it('returns null when invalid', () => {
    expect(safeParseVehicleInfo(null)).toBeNull();
    expect(safeParseVehicleInfo({})).toBeNull();
    expect(safeParseVehicleInfo({ make: '' })).toBeNull();
    expect(safeParseVehicleInfo({ make: 12 })).toBeNull();
  });
});
