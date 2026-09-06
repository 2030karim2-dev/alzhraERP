import { describe, it, expect } from 'vitest';
import { reconciliationService } from './reconciliationService';
import type { DailyDrawerSummary } from '../types';

describe('reconciliationService', () => {
  describe('calculateDenominationsTotal', () => {
    it('calculates 0 for empty counts', () => {
      expect(reconciliationService.calculateDenominationsTotal({})).toBe(0);
    });

    it('accurately sums various denominations including fractional coins', () => {
      const counts = {
        '500': 3, // 1500
        '100': 4, // 400
        '50': 2, // 100
        '10': 3, // 30
        '1': 5, // 5
        '0.5': 2, // 1
      };
      // 1500 + 400 + 100 + 30 + 5 + 1 = 2036
      expect(reconciliationService.calculateDenominationsTotal(counts)).toBe(2036);
    });
  });

  describe('calculateVariance', () => {
    it('returns balanced when actual equals expected', () => {
      const result = reconciliationService.calculateVariance(1500, 1500);
      expect(result.status).toBe('balanced');
      expect(result.variance).toBe(0);
      expect(result.isWithinTolerance).toBe(true);
    });

    it('detects surplus within tolerance threshold', () => {
      const result = reconciliationService.calculateVariance(1505, 1500, 10);
      expect(result.status).toBe('surplus');
      expect(result.variance).toBe(5);
      expect(result.isWithinTolerance).toBe(true);
    });

    it('detects shortage outside tolerance threshold', () => {
      const result = reconciliationService.calculateVariance(1450, 1500, 10);
      expect(result.status).toBe('shortage');
      expect(result.variance).toBe(-50);
      expect(result.isWithinTolerance).toBe(false);
    });
  });

  describe('formatWhatsAppSummary', () => {
    it('formats a structured Arabic WhatsApp summary correctly', () => {
      const mockSummary: DailyDrawerSummary = {
        date: '2026-09-05',
        opening_float: 200,
        total_sales: 3000,
        cash_sales: 1800,
        card_sales: 1200,
        transfer_sales: 0,
        returns_cash: 50,
        returns_card: 0,
        petty_expenses_cash: 30,
        expected_cash_in_drawer: 1920, // 200 + 1800 - 50 - 30 = 1920
        expected_card_terminal: 1200,
        employee_breakdown: [
          {
            user_id: 'u1',
            employee_name: 'أحمد',
            invoice_count: 10,
            total_sales: 1600,
            cash_sales: 1000,
            card_sales: 600,
            transfer_sales: 0,
          },
          {
            user_id: 'u2',
            employee_name: 'محمد',
            invoice_count: 8,
            total_sales: 1400,
            cash_sales: 800,
            card_sales: 600,
            transfer_sales: 0,
          },
        ],
        existing_reconciliation: null,
        is_already_closed: false,
      };

      const msg = reconciliationService.formatWhatsAppSummary(
        mockSummary,
        1920,
        1200,
        200,
        1720,
        'محل الزهراء لقطع الغيار'
      );

      expect(msg).toContain('إقفال يومية محل الزهراء لقطع الغيار');
      expect(msg).toContain('2026-09-05');
      expect(msg).toContain('أحمد');
      expect(msg).toContain('محمد');
      expect(msg).toContain('متطابق تماماً');
      expect(msg).toContain('*المتبقي بالدرج لبكرة (فكة):* 200.00 ر.س');
      expect(msg).toContain('*الصافي المسلم للمالك:* 1720.00 ر.س');
    });

    it('includes bond cash receipts and disbursements when present', () => {
      const mockSummary: DailyDrawerSummary = {
        date: '2026-09-05',
        opening_float: 100,
        total_sales: 1000,
        cash_sales: 1000,
        card_sales: 0,
        transfer_sales: 0,
        returns_cash: 0,
        returns_card: 0,
        cash_receipts: 250,
        cash_disbursements: 50,
        petty_expenses_cash: 20,
        expected_cash_in_drawer: 1280, // 100 + 1000 + 250 - 50 - 20 = 1280
        expected_card_terminal: 0,
        employee_breakdown: [],
        existing_reconciliation: null,
        is_already_closed: false,
      };

      const msg = reconciliationService.formatWhatsAppSummary(
        mockSummary,
        1280,
        0,
        100,
        1180,
        'محل الزهراء'
      );

      expect(msg).toContain('*سندات قبض نقدية:* +250.00 ر.س');
      expect(msg).toContain('*سندات صرف نقدية:* -50.00 ر.س');
    });
  });
});
