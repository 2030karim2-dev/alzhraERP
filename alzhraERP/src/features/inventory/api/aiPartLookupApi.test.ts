import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiPartLookupApi } from './aiPartLookupApi';
import { supabase } from '../../../lib/supabaseClient';
import { partIntelligenceService } from '../../vin-intelligence/services/partIntelligenceService';

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../../vin-intelligence/services/partIntelligenceService', () => ({
  partIntelligenceService: {
    inspectPart: vi.fn(),
  },
}));

describe('aiPartLookupApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges edge function results and catalog intelligence seamlessly', async () => {
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: {
        alternatives: [
          {
            part_number: '11115-37050',
            sources: ['partsouq'],
            method: 'xref',
            confidence: 'high',
          },
        ],
        source_sites: ['partsouq'],
        image_url: 'https://cdn.example.com/part.jpg',
      },
      error: null,
    });

    (partIntelligenceService.inspectPart as any).mockResolvedValueOnce({
      partNumber: '11115-37051',
      alternatives: [
        {
          partNumber: '11115-37052',
          brand: 'TOYOTA',
          type: 'OEM',
          confidence: 'high',
          source: 'megazip',
        },
      ],
      imageUrl: 'https://cdn.example.com/part.jpg',
      source: 'megazip',
    });

    const res = await aiPartLookupApi.lookupPartNumber('11115-37051');

    expect(res.alternatives.length).toBe(2);
    expect(res.alternatives.some(a => a.part_number === '11115-37050')).toBe(true);
    expect(res.alternatives.some(a => a.part_number === '11115-37052')).toBe(true);
    expect(res.image_url).toBe('https://cdn.example.com/part.jpg');
    expect(res.source_sites).toContain('partsouq');
    expect(res.source_sites).toContain('megazip');
  });

  it('falls back to catalog intelligence if edge function throws an error', async () => {
    (supabase.functions.invoke as any).mockRejectedValueOnce(new Error('Network error'));

    (partIntelligenceService.inspectPart as any).mockResolvedValueOnce({
      partNumber: '12305-37021',
      alternatives: [
        {
          partNumber: '12305-37020',
          brand: 'TOYOTA',
          type: 'OEM',
          confidence: 'high',
          source: 'catalog',
        },
      ],
      source: 'catalog',
    });

    const res = await aiPartLookupApi.lookupPartNumber('12305-37021');

    expect(res.alternatives.length).toBe(1);
    expect(res.alternatives[0].part_number).toBe('12305-37020');
  });

  it('rejects empty or whitespace part numbers', async () => {
    await expect(aiPartLookupApi.lookupPartNumber('')).rejects.toThrow('يرجى تحديد رقم القطعة');
  });
});
