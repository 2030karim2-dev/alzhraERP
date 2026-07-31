
import { describe, it, expect } from 'vitest';
import { formatCurrency, cn, formatNumberDisplay } from './utils';

describe('Core Utils', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers with default SAR currency', () => {
      const result = formatCurrency(1000);
      expect(result).toBe('1,000.00 ر.س');
    });

    it('should format zero correctly', () => {
      const result = formatCurrency(0);
      expect(result).toBe('0.00 ر.س');
    });

    it('should format negative numbers correctly', () => {
      const result = formatCurrency(-50.5);
      expect(result).toContain('50.50');
    });

    it('should include currency symbol when currencyCode is provided', () => {
      const result = formatCurrency(1000, 'YER');
      expect(result).toContain('1,000.00');
    });
  });

  describe('formatNumberDisplay', () => {
    it('should format numbers with commas', () => {
      expect(formatNumberDisplay(1234567)).toBe('1,234,567');
    });
  });

  describe('cn (Tailwind Merge)', () => {
    it('should merge classes correctly', () => {
      const result = cn('p-4', 'bg-red-500');
      expect(result).toBe('p-4 bg-red-500');
    });

    it('should handle conditional classes', () => {
      const isTrue = true;
      const isFalse = false;
      const result = cn(
        'base-class',
        isTrue && 'active',
        isFalse && 'inactive'
      );
      expect(result).toBe('base-class active');
    });

    it('should resolve tailwind conflicts (last wins)', () => {
      // p-4 should be overwritten by p-8
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });
  });
});
