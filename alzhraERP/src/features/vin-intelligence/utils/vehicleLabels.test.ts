import { describe, it, expect } from 'vitest';
import { fuelLabel, driveLabel, transLabel } from './vehicleLabels';

describe('vehicleLabels', () => {
  it('maps fuel types to Arabic', () => {
    expect(fuelLabel('Diesel')).toBe('ديزل');
    expect(fuelLabel('Gasoline')).toBe('بترول');
    expect(fuelLabel('Electric')).toBe('كهرباء');
    expect(fuelLabel('Hybrid')).toBe('هجين');
    expect(fuelLabel('LPG')).toBe('LPG');
  });

  it('maps drive types to Arabic', () => {
    expect(driveLabel('4WD')).toBe('دبل');
    expect(driveLabel('FWD')).toBe('سنجل');
  });

  it('maps transmission to Arabic', () => {
    expect(transLabel('Automatic')).toBe('أوتوماتيك');
    expect(transLabel('Manual')).toBe('عادي');
  });
});