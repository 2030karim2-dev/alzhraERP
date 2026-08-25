import { describe, it, expect } from 'vitest';
import { supplierPortalService } from './supplierPortalService';
import type { VendorQuotation } from '../types';

describe('supplierPortalService', () => {
  describe('calculateComparisonMatrix', () => {
    it('returns empty array when given no quotations', () => {
      const result = supplierPortalService.calculateComparisonMatrix([]);
      expect(result).toEqual([]);
    });

    it('ranks lowest price and fastest delivery with higher composite score', () => {
      const mockQuotes: VendorQuotation[] = [
        {
          quotation_id: 'q1',
          company_id: 'c1',
          quotation_number: 'VQ-001',
          rfq_id: null,
          supplier_id: 's1',
          supplier_name: 'المورد الأول (سعر أقل وسرعة أعلى)',
          status: 'submitted',
          current_revision_number: 1,
          valid_until: '2026-12-31',
          currency: 'SAR',
          exchange_rate: 1,
          subtotal: 1000,
          discount_amount: 0,
          tax_amount: 150,
          total_amount: 1150,
          delivery_lead_time_days: 2,
          warranty_terms: '1 year',
          terms_and_conditions: null,
          notes: null,
          converted_po_id: null,
          created_at: '2026-08-01',
          updated_at: '2026-08-01',
          items: [
            {
              product_id: 'p1',
              product_name: 'قطعة 1',
              quantity: 1,
              unit_of_measure: 'حبة',
              unit_price: 1000,
              discount_percentage: 0,
              discount_amount: 0,
              tax_percentage: 15,
              tax_amount: 150,
              net_unit_price: 1000,
              total_price: 1150,
              availability: 'in_stock',
              lead_time_days: 2,
              warranty_days: 365,
            },
          ],
        },
        {
          quotation_id: 'q2',
          company_id: 'c1',
          quotation_number: 'VQ-002',
          rfq_id: null,
          supplier_id: 's2',
          supplier_name: 'المورد الثاني (سعر أعلى وتسليم أبطأ)',
          status: 'submitted',
          current_revision_number: 1,
          valid_until: '2026-12-31',
          currency: 'SAR',
          exchange_rate: 1,
          subtotal: 2000,
          discount_amount: 0,
          tax_amount: 300,
          total_amount: 2300,
          delivery_lead_time_days: 10,
          warranty_terms: '6 months',
          terms_and_conditions: null,
          notes: null,
          converted_po_id: null,
          created_at: '2026-08-01',
          updated_at: '2026-08-01',
          items: [
            {
              product_id: 'p1',
              product_name: 'قطعة 1',
              quantity: 1,
              unit_of_measure: 'حبة',
              unit_price: 2000,
              discount_percentage: 0,
              discount_amount: 0,
              tax_percentage: 15,
              tax_amount: 300,
              net_unit_price: 2000,
              total_price: 2300,
              availability: 'on_order',
              lead_time_days: 10,
              warranty_days: 180,
            },
          ],
        },
      ];

      const scored = supplierPortalService.calculateComparisonMatrix(mockQuotes);

      expect(scored).toHaveLength(2);
      expect(scored[0].quotation_id).toBe('q1');
      expect(scored[0].rank).toBe(1);
      expect(scored[0].is_recommended).toBe(true);
      expect(scored[0].badges.is_lowest_price).toBe(true);
      expect(scored[0].badges.is_fastest_delivery).toBe(true);

      expect(scored[1].quotation_id).toBe('q2');
      expect(scored[1].rank).toBe(2);
      expect(scored[1].is_recommended).toBe(false);
    });
  });
});
