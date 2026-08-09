/**
 * Phase 5 — Part Intelligence Unit Tests
 * Pure-logic tests: normalization, fitment classification, match quality.
 */
import { describe, it, expect } from 'vitest';
import { normalizeOem } from '../../core/utils/oemNormalization';
import { FitmentEngine } from './services/FitmentEngine';
import type { PartReference, FitmentEvidence, MatchQuality } from './types/models';

describe('OEM Normalization (Phase 2A rules)', () => {
  it('strips hyphens: 90919-01221 → 9091901221', () => {
    expect(normalizeOem('90919-01221')).toBe('9091901221');
  });
  it('strips spaces, slashes, periods', () => {
    expect(normalizeOem('90919 01221')).toBe('9091901221');
    expect(normalizeOem('90919/012.21')).toBe('9091901221');
  });
  it('uppercases', () => {
    expect(normalizeOem('abc-123')).toBe('ABC123');
  });
  it('handles null/undefined/empty', () => {
    expect(normalizeOem(null)).toBe('');
    expect(normalizeOem(undefined)).toBe('');
    expect(normalizeOem('')).toBe('');
  });
  it('does NOT create false equivalence', () => {
    expect(normalizeOem('90919-01221')).not.toBe(normalizeOem('90919-01240'));
  });
});

describe('Real OEM test dataset', () => {
  const cases = [
    ['90919-01221', '9091901221'],
    ['15208-65F00', '1520865F00'],
    ['26300-35503', '2630035503'],
    ['8-97369-291-0', '8973692910'],
    ['MD135737', 'MD135737'],
    ['15400-PLM-A01', '15400PLMA01'],
  ] as const;
  it.each(cases)('%s → %s', (raw, norm) => {
    expect(normalizeOem(raw)).toBe(norm);
  });
});

describe('FitmentEngine', () => {
  const engine = new FitmentEngine();
  const makeEvidence = (): FitmentEvidence => ({
    status: 'CONFIRMED', evidence: 'test', evidenceSource: 'FAPI',
    part: { normalizedNumber: 'X', displayNumber: 'X', manufacturer: 'A', description: 'test' },
    provider: 'FAPI', resolvedAt: new Date().toISOString(),
  });

  it('CONFIRMED with authoritative evidence', () => {
    expect(engine.assess('X', 'VIN', [], [], makeEvidence()).status).toBe('CONFIRMED');
  });
  it('POSSIBLE with high-confidence cross-refs', () => {
    const refs: PartReference[] = [{ normalizedNumber: 'Y', displayNumber: 'Y', manufacturer: 'B', matchQuality: 'EXACT', confidence: 4 }];
    expect(engine.assess('X', 'VIN', refs, [], null).status).toBe('POSSIBLE');
  });
  it('POSSIBLE with vehicle applications', () => {
    expect(engine.assess('X', 'VIN', [], [{ make: 'TOYOTA', model: 'CAMRY' }], null).status).toBe('POSSIBLE');
  });
  it('UNKNOWN with no evidence', () => {
    expect(engine.assess('X', 'VIN', [], [], null).status).toBe('UNKNOWN');
  });
  it('isSafeForProcurement: only CONFIRMED', () => {
    expect(engine.isSafeForProcurement(engine.assess('X', 'VIN', [], [], makeEvidence()))).toBe(true);
    expect(engine.isSafeForProcurement(engine.assess('X', 'VIN', [], [], null))).toBe(false);
  });
  it('normalizeExternalStatus maps correctly', () => {
    expect(engine.normalizeExternalStatus('VERIFIED', 'FAPI')).toBe('CONFIRMED');
    expect(engine.normalizeExternalStatus('EXACT', 'TECDOC')).toBe('CONFIRMED');
    expect(engine.normalizeExternalStatus('POSSIBLE', 'FAPI')).toBe('POSSIBLE');
    expect(engine.normalizeExternalStatus('NOT_COMPATIBLE', 'FAPI')).toBe('NOT_COMPATIBLE');
    expect(engine.normalizeExternalStatus('RANDOM', 'FAPI')).toBe('UNKNOWN');
  });
});

describe('MatchQuality', () => {
  it('distinct categories', () => {
    const a: MatchQuality = 'EXACT';
    const b: MatchQuality = 'EQUIVALENT';
    expect(a).not.toBe(b);
  });
});
