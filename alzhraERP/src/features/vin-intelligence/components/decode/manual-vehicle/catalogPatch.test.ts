import { describe, expect, it } from 'vitest';
import type { ExtractedCatalogVehicle } from '../../../utils/catalogTextExtractor';
import { buildDraftPatch } from './catalogPatch';

function vehicle(patch: Partial<ExtractedCatalogVehicle> = {}): ExtractedCatalogVehicle {
  return { confidenceScore: 90, extractedFieldsCount: 3, ...patch };
}

describe('buildDraftPatch', () => {
  it('prefers the Arabic make name when present', () => {
    expect(buildDraftPatch(vehicle({ make: 'Toyota', makeAr: 'تويوتا' }))).toMatchObject({
      make: 'تويوتا',
    });
  });

  it('falls back to the raw make when the Arabic name is empty', () => {
    expect(buildDraftPatch(vehicle({ make: 'Toyota', makeAr: '' }))).toMatchObject({
      make: 'Toyota',
    });
  });

  it('omits make entirely when both names are empty', () => {
    const patch = buildDraftPatch(vehicle({ make: '', makeAr: null }));
    expect(patch).not.toHaveProperty('make');
  });

  it('maps every present spec and drops empty strings', () => {
    const patch = buildDraftPatch(
      vehicle({
        model: 'Hilux',
        yearStart: '2006',
        yearEnd: '2015',
        market: 'خليجي',
        engine: '2.7',
        transmission: 'عادي',
        drive: 'دبل',
        vin: 'JT3HN87R123456789',
      })
    );
    expect(patch).toEqual({
      model: 'Hilux',
      yearStart: '2006',
      yearEnd: '2015',
      market: 'خليجي',
      engine: '2.7',
      transmission: 'عادي',
      drive: 'دبل',
      vinOptional: 'JT3HN87R123456789',
    });
  });

  it('returns an empty patch when nothing was extracted', () => {
    expect(buildDraftPatch(vehicle({ model: '', vin: '' }))).toEqual({});
  });
});
