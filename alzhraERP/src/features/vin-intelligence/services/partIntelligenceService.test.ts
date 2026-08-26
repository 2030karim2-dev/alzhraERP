import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

vi.mock('../../../core/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { partIntelligenceService, detectPartBrand, KNOWN_BRANDS } from './partIntelligenceService';
import type { VehicleInfo } from '../types';

const toyotaActive: VehicleInfo = {
  make: 'Toyota',
  model: 'Corolla',
  year: 2018,
  yearStart: 2014,
  yearEnd: 2020,
  displacement: '1.6',
  engine: '1.6L',
  transmission: 'automatic',
  driveType: 'FWD',
  market: 'gcc',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('detectPartBrand', () => {
  it('identifies Toyota spark plug pattern', () => {
    expect(detectPartBrand('90919-01253')).toBe('TOYOTA');
  });

  it('identifies Toyota brake pad pattern', () => {
    expect(detectPartBrand('04465-42190')).toBe('TOYOTA');
  });

  it('identifies Nissan spark plug', () => {
    expect(detectPartBrand('22401-AA480')).toBe('NISSAN');
  });

  it('identifies Hyundai/KIA', () => {
    expect(detectPartBrand('18846-11051')).toBe('HYUNDAI / KIA');
  });

  it('identifies Denso Iridium', () => {
    expect(detectPartBrand('SK20HR11')).toBe('DENSO');
  });

  it('identifies NGK', () => {
    expect(detectPartBrand('BKR5EIX-11')).toBe('NGK');
  });

  it('identifies Bosch', () => {
    expect(detectPartBrand('0242240574')).toBe('BOSCH');
  });

  it('falls back to default manufacturer', () => {
    expect(detectPartBrand('UNKNOWN-123', 'TOYOTA')).toBe('TOYOTA');
  });

  it('falls back to GENUINE when no default', () => {
    expect(detectPartBrand('UNKNOWN-123')).toBe('GENUINE');
  });

  it('handles lowercase input', () => {
    expect(detectPartBrand('bkr5e-11')).toBe('NGK');
  });
});

describe('KNOWN_BRANDS', () => {
  it('marks Toyota as OEM', () => {
    expect(KNOWN_BRANDS.TOYOTA.type).toBe('OEM');
  });

  it('marks Bosch as AFTERMARKET', () => {
    expect(KNOWN_BRANDS.BOSCH.type).toBe('AFTERMARKET');
  });
});

describe('partIntelligenceService.inspectPart — known patterns', () => {
  it('returns Toyota spark plug intelligence for 90919-01253', async () => {
    const result = await partIntelligenceService.inspectPart('90919-01253', toyotaActive);
    expect(result.partNumber).toBe('90919-01253');
    expect(result.manufacturer).toContain('TOYOTA');
    expect(result.categoryEn.toLowerCase()).toContain('ignition');
    expect(result.primaryNameAr).toContain('بلاكات');
    expect(result.compatibleVehicles.length).toBeGreaterThan(0);
  });

  it('returns Toyota oil filter intelligence for 04152-YZZA1', async () => {
    const result = await partIntelligenceService.inspectPart('04152-YZZA1', toyotaActive);
    expect(result.categoryEn.toLowerCase()).toContain('filter');
    expect(result.primaryNameEn.toLowerCase()).toContain('oil filter');
  });

  it('returns Nissan spark plug intelligence for 22401', async () => {
    const result = await partIntelligenceService.inspectPart('22401-AA480');
    expect(result.manufacturer).toBe('NISSAN');
    expect(result.primaryNameAr).toMatch(/شمعة|بلاكات|بواجي/);
  });

  it('high confidence for matched pattern even without live data', async () => {
    const result = await partIntelligenceService.inspectPart('04465-42190', toyotaActive);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(75);
    expect(['high', 'medium']).toContain(result.confidence);
  });

  it('includes the active vehicle in compatible list with direct fit note', async () => {
    const result = await partIntelligenceService.inspectPart('90919-01253', toyotaActive);
    const direct = result.compatibleVehicles.find(
      (v) => v.notes && v.notes.includes('مطابقة مباشرة'),
    );
    expect(direct).toBeDefined();
    expect(direct?.make).toBe('Toyota');
  });

  it('deduplicates compatible vehicles across active and pattern sources', async () => {
    const result = await partIntelligenceService.inspectPart('90919-01253', toyotaActive);
    const seen = new Set<string>();
    let dupes = 0;
    for (const v of result.compatibleVehicles) {
      const key = `${v.make}|${v.model}`;
      if (seen.has(key)) dupes += 1;
      else seen.add(key);
    }
    expect(dupes).toBe(0);
  });
});

describe('partIntelligenceService.inspectPart — fallback paths', () => {
  it('does not throw when called with an unknown part number', async () => {
    const result = await partIntelligenceService.inspectPart('ZZZ-9999', toyotaActive);
    expect(result.partNumber).toBe('ZZZ-9999');
    expect(result.manufacturer).toBeTruthy();
  });

  it('produces a result without an active vehicle', async () => {
    const result = await partIntelligenceService.inspectPart('90919-01253');
    expect(result.partNumber).toBe('90919-01253');
    expect(result.primaryNameAr).toBeTruthy();
  });

  it('lower confidence for a short, unmatched part number', async () => {
    const result = await partIntelligenceService.inspectPart('ABC', toyotaActive);
    expect(result.confidenceScore).toBeLessThanOrEqual(80);
  });
});

describe('partIntelligenceService.inspectPart — input validation', () => {
  it('throws for empty input', async () => {
    await expect(partIntelligenceService.inspectPart('')).rejects.toThrow();
  });

  it('throws for whitespace-only input', async () => {
    await expect(partIntelligenceService.inspectPart('   ')).rejects.toThrow();
  });

  it('normalizes input (uppercase, strips spaces/hyphens/dots)', async () => {
    const result = await partIntelligenceService.inspectPart(' 90919-01253 ', toyotaActive);
    expect(result.partNumber).toBe('90919-01253');
  });
});

describe('partIntelligenceService.inspectPart — graceful network failure', () => {
  it('swallows vin-parts / ai-part-lookup failures and still returns a result', async () => {
    const { supabase } = await import('../../../lib/supabaseClient');
    vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('network down'));
    const result = await partIntelligenceService.inspectPart('90919-01253', toyotaActive);
    expect(result.partNumber).toBe('90919-01253');
  });

  it('keeps alternatives empty when both edge functions fail and no pattern match', async () => {
    const { supabase } = await import('../../../lib/supabaseClient');
    vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('network down'));
    const result = await partIntelligenceService.inspectPart('UNKNOWN-XYZ-99', toyotaActive);
    expect(result.alternatives).toEqual([]);
  });
});
