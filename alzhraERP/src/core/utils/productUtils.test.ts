import { describe, it, expect } from 'vitest';
import { isRawUuid, getDisplayItemName, getDisplayItemCode } from './productUtils';

describe('productUtils', () => {
  describe('isRawUuid', () => {
    it('detects standard UUIDs', () => {
      expect(isRawUuid('51e12d3b-6709-40c2-99ae-80cd03e6f562')).toBe(true);
      expect(isRawUuid('385F108F-2801-4788-A89F-96052D66DB81')).toBe(true);
    });

    it('rejects regular names, SKUs and part numbers', () => {
      expect(isRawUuid('سير تيمت كرولا 95م 121MY21 موكل')).toBe(false);
      expect(isRawUuid('13568-19056')).toBe(false);
      expect(isRawUuid('')).toBe(false);
      expect(isRawUuid(null)).toBe(false);
      expect(isRawUuid(undefined)).toBe(false);
    });
  });

  describe('getDisplayItemName', () => {
    it('prefers product.name_ar over description when description is a UUID', () => {
      const item = {
        description: '51e12d3b-6709-40c2-99ae-80cd03e6f562',
        product: {
          name_ar: 'سير تيمت كرولا 95م 121MY21 موكل',
          sku: '13568-19056',
        },
      };
      expect(getDisplayItemName(item)).toBe('سير تيمت كرولا 95م 121MY21 موكل');
    });

    it('prefers product.name_ar even when description is valid text', () => {
      const item = {
        description: 'وصف إضافي للبند',
        product: {
          name_ar: 'فحمات فرامل تويوتا',
        },
      };
      expect(getDisplayItemName(item)).toBe('فحمات فرامل تويوتا');
    });

    it('falls back to description if product is not present and description is not a UUID', () => {
      const item = {
        description: 'بند خدمة أو منتج يدوي',
      };
      expect(getDisplayItemName(item)).toBe('بند خدمة أو منتج يدوي');
    });

    it('skips description if it is a UUID and falls back to part number or default', () => {
      const itemWithPart = {
        description: '51e12d3b-6709-40c2-99ae-80cd03e6f562',
        part_number: 'PART-1234',
      };
      expect(getDisplayItemName(itemWithPart)).toBe('PART-1234');

      const itemOnlyUuid = {
        description: '51e12d3b-6709-40c2-99ae-80cd03e6f562',
      };
      expect(getDisplayItemName(itemOnlyUuid)).toBe('صنف بدون اسم');
    });
  });

  describe('getDisplayItemCode', () => {
    it('extracts part number or SKU and ignores UUIDs', () => {
      expect(
        getDisplayItemCode({
          part_number: '13568-19056',
        })
      ).toBe('13568-19056');

      expect(
        getDisplayItemCode({
          sku: 'SKU-9988',
        })
      ).toBe('SKU-9988');

      expect(
        getDisplayItemCode({
          part_number: '51e12d3b-6709-40c2-99ae-80cd03e6f562',
        })
      ).toBe('---');
    });
  });
});
