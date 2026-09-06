import { describe, it, expect } from 'vitest';
import {
  normalizeArabicDigits,
  normalizeArabic,
  normalizeSearch,
  matchesArabicSearch,
  filterByArabicSearch,
  scoreSearchResult,
} from './search';

describe('search utilities with Arabic digits support', () => {
  describe('normalizeArabicDigits', () => {
    it('converts Eastern Arabic digits (٠-٩) to ASCII (0-9)', () => {
      expect(normalizeArabicDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    });

    it('converts Persian/Urdu digits (۰-۹) to ASCII (0-9)', () => {
      expect(normalizeArabicDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    });

    it('handles mixed strings containing letters and Arabic digits', () => {
      expect(normalizeArabicDigits('INV-١٠٠٢-س')).toBe('INV-1002-س');
      expect(normalizeArabicDigits('٩٠٩١٩-٠٢٢٤٠')).toBe('90919-02240');
      expect(normalizeArabicDigits('هاتف ٠٥٠١٢٣٤٥٦٧')).toBe('هاتف 0501234567');
    });

    it('handles null, undefined and empty string gracefully', () => {
      expect(normalizeArabicDigits('')).toBe('');
      expect(normalizeArabicDigits(null)).toBe('');
      expect(normalizeArabicDigits(undefined)).toBe('');
    });
  });

  describe('normalizeArabic', () => {
    it('normalizes Arabic digits together with letters and diacritics', () => {
      const input = 'فَاتُورَة رَقْم ١٢٣';
      const output = normalizeArabic(input);
      expect(output).toBe('فاتوره رقم 123');
    });

    it('normalizes hamzas, ta marbuta, and alif maqsura', () => {
      expect(normalizeArabic('أحمد إبراهيم آمنة')).toBe('احمد ابراهيم امنه');
      expect(normalizeArabic('مستشفى')).toBe('مستشفي');
      expect(normalizeArabic('مسؤول')).toBe('مسوول');
      expect(normalizeArabic('فئة')).toBe('فيه');
    });

    it('strips tatweel (kashida) and harakat', () => {
      expect(normalizeArabic('بـــاركـــود')).toBe('باركود');
      expect(normalizeArabic('مُحَمَّد')).toBe('محمد');
    });
  });

  describe('normalizeSearch', () => {
    it('lowercases, strips extra spaces, and converts Arabic digits', () => {
      expect(normalizeSearch('  INV-١٠٠٢  ')).toBe('inv-1002');
      expect(normalizeSearch('تويوتا كورولا ٢٠٢٢')).toBe('تويوتا كورولا 2022');
      expect(normalizeSearch('')).toBe('');
      expect(normalizeSearch(null)).toBe('');
    });
  });

  describe('matchesArabicSearch', () => {
    it('matches when query has Arabic digits and target has English digits', () => {
      expect(matchesArabicSearch('Part-90919-02240', '٩٠٩١٩')).toBe(true);
      expect(matchesArabicSearch('فلتر زيت 15601', '١٥٦٠١')).toBe(true);
      expect(matchesArabicSearch('INV-1002', '١٠٠٢')).toBe(true);
      expect(matchesArabicSearch('0501234567', '٠٥٠١٢٣')).toBe(true);
    });

    it('matches when query has English digits and target has Arabic digits', () => {
      expect(matchesArabicSearch('سنة ٢٠٢٤', '2024')).toBe(true);
    });

    it('matches multi-token queries with mixed digits and Arabic letters', () => {
      expect(matchesArabicSearch('قماش فرامل أمامية 04465-02220 تويوتا', 'فرامل ٠٤٤٦٥')).toBe(true);
    });
  });

  describe('filterByArabicSearch', () => {
    const products = [
      { id: '1', name: 'بواجي تويوتا', sku: '90919-01192', barcode: '62810001' },
      { id: '2', name: 'قماش فرامل نيسان', sku: 'D1060-1HA0A', barcode: '62820002' },
      { id: '3', name: 'فلتر هواء كورولا 2020', sku: '17801-21050', barcode: '62830003' },
    ];

    it('filters products correctly when searching with Arabic digits', () => {
      const resultsBySku = filterByArabicSearch(
        products,
        '٩٠٩١٩',
        p => `${p.name} ${p.sku} ${p.barcode}`
      );
      expect(resultsBySku).toHaveLength(1);
      expect(resultsBySku[0].id).toBe('1');

      const resultsByBarcode = filterByArabicSearch(
        products,
        '٦٢٨٢',
        p => `${p.name} ${p.sku} ${p.barcode}`
      );
      expect(resultsByBarcode).toHaveLength(1);
      expect(resultsByBarcode[0].id).toBe('2');

      const resultsByYear = filterByArabicSearch(
        products,
        'كورولا ٢٠٢٠',
        p => `${p.name} ${p.sku} ${p.barcode}`
      );
      expect(resultsByYear).toHaveLength(1);
      expect(resultsByYear[0].id).toBe('3');
    });
  });

  describe('scoreSearchResult', () => {
    it('accurately scores search terms with Arabic digits', () => {
      const item = {
        name_ar: 'بواجي تويوتا 90919',
        sku: '90919-01192',
        part_number: '90919',
      };
      const score = scoreSearchResult('٩٠٩١٩', item);
      expect(score).toBeGreaterThan(0);
    });
  });
});
