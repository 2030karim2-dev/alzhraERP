import { describe, it, expect } from 'vitest';
import { getRateToSAR } from '../../../features/purchases/components/quotations/QuotationComparisonView';
import { computeAutoFitWidths } from '../../../core/utils/excelExporterBase';
import {
  detectImportConflicts,
  type RawImportRow,
} from '../../../features/inventory/hooks/useExcelImport';

describe('Quotation Currency Normalization', () => {
  it('should return 1 for SAR', () => {
    expect(getRateToSAR('SAR')).toBe(1);
    expect(getRateToSAR('sar')).toBe(1);
  });

  it('should return 3.75 for USD default rate', () => {
    expect(getRateToSAR('USD')).toBe(3.75);
  });

  it('should calculate correct rate for YER (410 YER = 1 SAR)', () => {
    // When quotationRate is passed as 410, rate to SAR is 1/410
    const rateWithQuotation = getRateToSAR('YER', 410);
    expect(rateWithQuotation).toBeCloseTo(1 / 410, 6);

    // Default rate
    const defaultRate = getRateToSAR('YER');
    expect(defaultRate).toBeCloseTo(1 / 410, 6);
  });

  it('should prefer custom quotation exchange rate if valid', () => {
    expect(getRateToSAR('USD', 3.8)).toBe(3.8);
  });
});

describe('Dynamic Auto-Fit Column Widths (computeAutoFitWidths)', () => {
  it('should expand column width if text exceeds base width', () => {
    const rows = [
      ['اسم الصنف', 'الباركود'],
      ['فحمات فرامل أمامية أصلية تويوتا لاندكروزر', '628100000001'],
    ];
    const baseWidths = [10, 10];
    const widths = computeAutoFitWidths(rows, baseWidths, 4);

    expect(widths[0]).toBeGreaterThanOrEqual(40);
    expect(widths[1]).toBeGreaterThanOrEqual(16);
  });

  it('should cap width at 60 to prevent absurdly wide columns', () => {
    const longText = 'أ'.repeat(100);
    const rows = [[longText]];
    const widths = computeAutoFitWidths(rows, [10], 4);
    expect(widths[0]).toBe(60);
  });

  it('should preserve base width if text is shorter than base width', () => {
    const rows = [['قصير']];
    const baseWidths = [25];
    const widths = computeAutoFitWidths(rows, baseWidths, 4);
    expect(widths[0]).toBe(25);
  });
});

describe('Pre-flight Anti-Duplication (detectImportConflicts)', () => {
  it('should detect in-file duplicate barcodes', async () => {
    const rows: RawImportRow[] = [
      { name: 'منتج 1', barcode: '123456', sku: 'SKU-1' },
      { name: 'منتج 2', barcode: '123456', sku: 'SKU-2' },
    ];
    const conflicts = await detectImportConflicts(rows, '');
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(conflicts[0].type).toBe('IN_FILE_DUPLICATE');
    expect(conflicts[0].field).toBe('barcode');
  });

  it('should detect in-file duplicate part number and brand combination', async () => {
    const rows: RawImportRow[] = [
      { name: 'قطعة 1', partNumber: '04465-0K240', brand: 'Toyota' },
      { name: 'قطعة 2', partNumber: '04465-0k240 ', brand: ' toyota' },
    ];
    const conflicts = await detectImportConflicts(rows, '');
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(conflicts[0].field).toBe('partNumber');
  });

  it('should pass cleanly when all items are distinct', async () => {
    const rows: RawImportRow[] = [
      { name: 'صنف 1', barcode: '111', sku: 'S1', partNumber: 'P1', brand: 'B1' },
      { name: 'صنف 2', barcode: '222', sku: 'S2', partNumber: 'P2', brand: 'B2' },
    ];
    const conflicts = await detectImportConflicts(rows, '');
    expect(conflicts).toHaveLength(0);
  });
});
