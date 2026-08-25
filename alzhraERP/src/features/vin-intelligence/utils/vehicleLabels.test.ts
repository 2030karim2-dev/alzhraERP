import { describe, it, expect } from 'vitest';
import { fuelLabel, driveLabel, transLabel } from './vehicleLabels';

describe('vehicleLabels', () => {
  it('maps fuel types to Arabic', () => {
    expect(fuelLabel('Diesel')).toBe('ديزل');
    expect(fuelLabel('Gasoline')).toBe('بترول');
    expect(fuelLabel('Electric')).toBe('كهرباء بالكامل (EV)');
    expect(fuelLabel('Hybrid')).toBe('هجين (هايبرد)');
    expect(fuelLabel('LPG')).toBe('LPG');
  });

  it('maps drive types to Arabic', () => {
    expect(driveLabel('4WD')).toBe('دبل (4x4)');
    expect(driveLabel('FWD')).toBe('سنجل أمامي (FWD)');
  });

  it('maps transmission to Arabic', () => {
    expect(transLabel('Automatic')).toBe('تماتيك (أوتوماتيك)');
    expect(transLabel('Manual')).toBe('عادي (مانيوال)');
  });
});