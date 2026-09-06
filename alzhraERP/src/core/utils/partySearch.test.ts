import { describe, it, expect } from 'vitest';
import { matchParty, filterPartiesSmart, normalizePhoneNumber } from './partySearch';
import type { Party } from '../../features/parties/types';

describe('partySearch with Arabic numerals support', () => {
  describe('normalizePhoneNumber', () => {
    it('normalizes Eastern Arabic phone numbers to standard format', () => {
      expect(normalizePhoneNumber('٠٥٠١٢٣٤٥٦٧')).toBe('501234567');
      expect(normalizePhoneNumber('+٩٦٦٥٠١٢٣٤٥٦٧')).toBe('501234567');
      expect(normalizePhoneNumber('٠٠٩٦٦٥٠١٢٣٤٥٦٧')).toBe('501234567');
    });

    it('normalizes English phone numbers consistently', () => {
      expect(normalizePhoneNumber('0501234567')).toBe('501234567');
      expect(normalizePhoneNumber('+966501234567')).toBe('501234567');
    });
  });

  describe('matchParty and filterPartiesSmart', () => {
    const mockParties: Party[] = [
      {
        id: '1',
        company_id: 'comp-1',
        name: 'شركة الأمل للتجارة',
        type: 'customer',
        phone: '0501234567',
        tax_number: '300123456700003',
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: '2',
        company_id: 'comp-1',
        name: 'مؤسسة النور لقطع الغيار',
        type: 'supplier',
        phone: '0559876543',
        tax_number: '300987654300003',
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    it('matches party by phone when search query is in Arabic digits', () => {
      const match = matchParty(mockParties[0], '٠٥٠١٢٣٤٥٦٧');
      expect(match.matches).toBe(true);
      expect(match.score).toBeGreaterThan(100);
    });

    it('matches party by tax number when search query is in Arabic digits', () => {
      const match = matchParty(mockParties[1], '٣٠٠٩٨٧٦٥٤٣');
      expect(match.matches).toBe(true);
    });

    it('filters parties list using Arabic phone numbers', () => {
      const filtered = filterPartiesSmart(mockParties, '٠٥٥٩٨٧');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('filters parties list by name with or without hamza', () => {
      const filtered = filterPartiesSmart(mockParties, 'الامل');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });
});
