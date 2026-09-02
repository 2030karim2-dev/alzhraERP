import { describe, it, expect } from 'vitest';
import { parseBulkPartsText } from './partsExcelHelper';
import type { VehicleInfo } from '../types';

describe('parseBulkPartsText', () => {
  const noahVehicle: VehicleInfo = {
    make: 'Toyota',
    model: 'NOAH VOXY',
    year: 2011,
    driveType: '4WD',
    engine: '3ZRFA',
  };

  it('correctly parses user sample with alternating name and OEM number', () => {
    const rawInput = `
باكن راس
11115-37051
كرسي مكينه يمين
12305-37021
`;

    const parts = parseBulkPartsText(rawInput, noahVehicle);

    expect(parts).toHaveLength(2);

    expect(parts[0].baseName).toBe('باكن راس');
    expect(parts[0].partNumber).toBe('11115-37051');
    expect(parts[0].description).toBe('باكن راس باص نوها 2011 دبل مكينة 3ZRFA');

    expect(parts[1].baseName).toBe('كرسي مكينه يمين');
    expect(parts[1].partNumber).toBe('12305-37021');
    expect(parts[1].description).toBe('كرسي مكينه يمين باص نوها 2011 دبل مكينة 3ZRFA');
  });

  it('correctly parses inline part names and OEM numbers', () => {
    const rawInput = `
باكن غطاء 11213-37021
بلف حرارة 90916-03140
`;

    const parts = parseBulkPartsText(rawInput, noahVehicle);

    expect(parts).toHaveLength(2);

    expect(parts[0].baseName).toBe('باكن غطاء');
    expect(parts[0].partNumber).toBe('11213-37021');
    expect(parts[0].description).toBe('باكن غطاء باص نوها 2011 دبل مكينة 3ZRFA');

    expect(parts[1].baseName).toBe('بلف حرارة');
    expect(parts[1].partNumber).toBe('90916-03140');
    expect(parts[1].description).toBe('بلف حرارة باص نوها 2011 دبل مكينة 3ZRFA');
  });
});
