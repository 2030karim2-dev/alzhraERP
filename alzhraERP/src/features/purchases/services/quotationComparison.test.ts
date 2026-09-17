import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EXCHANGE_RATES_TO_SAR,
  asRateCode,
  asRateValue,
  buildQuotationComparison,
  computeTotalDifference,
  getRateToSAR,
  normalizeComparisonSupplier,
  normalizeComparisonSuppliers,
  type ComparisonQuotationItem,
  type ComparisonSupplier,
} from './quotationComparison';

const supplier = (overrides: Partial<ComparisonSupplier> = {}): ComparisonSupplier => ({
  id: 's1',
  quotation_number: 'Q-1',
  status: 'sent',
  total_amount: 1000,
  currency_code: 'SAR',
  exchange_rate: null,
  delivery_terms: null,
  payment_terms: null,
  party: { id: 'p1', name: 'مورد أ' },
  quotation_items: [],
  ...overrides,
});

describe('getRateToSAR — ترتيب الأفضلية', () => {
  it('يعيد 1 للريال السعودي بأي حالة أحرف', () => {
    expect(getRateToSAR('SAR')).toBe(1);
    expect(getRateToSAR('sar')).toBe(1);
  });

  it('يعيد أسعار الجدول الافتراضي', () => {
    expect(getRateToSAR('USD')).toBe(3.75);
    expect(getRateToSAR('YER')).toBeCloseTo(1 / 410, 6);
  });

  it('يعكس سعر اليمني المعلن كعدد ريالات لكل دولار', () => {
    expect(getRateToSAR('YER', 410)).toBeCloseTo(1 / 410, 6);
  });

  it('يعتمد سعر العرض الصريح قبل سعر المنشأة', () => {
    const tenantRates = new Map<string, number>([['USD', 3.9]]);
    expect(getRateToSAR('USD', 3.8, tenantRates)).toBe(3.8);
  });

  it('يستخدم سعر المنشأة عند غياب سعر العرض', () => {
    const tenantRates = new Map<string, number>([['USD', 3.9]]);
    expect(getRateToSAR('USD', null, tenantRates)).toBe(3.9);
    expect(getRateToSAR('USD', undefined, tenantRates)).toBe(3.9);
  });

  it('يعكس سعر المنشأة لليمني عند تجاوزه 1', () => {
    const tenantRates = new Map<string, number>([['YER', 410]]);
    expect(getRateToSAR('YER', null, tenantRates)).toBeCloseTo(1 / 410, 6);
  });

  it('يتجاهل الأسعار غير الموجبة ويعود للافتراضي', () => {
    expect(getRateToSAR('USD', 0)).toBe(3.75);
    expect(getRateToSAR('USD', Number.NaN)).toBe(3.75);
    expect(getRateToSAR('XYZ')).toBe(1);
  });

  it('يحافظ على جدول الأسعار العام كما هو', () => {
    expect(DEFAULT_EXCHANGE_RATES_TO_SAR.SAR).toBe(1);
    expect(DEFAULT_EXCHANGE_RATES_TO_SAR.OMR).toBe(9.75);
  });
});

describe('قراءة قيم أسعار الصرف غير الموثوقة', () => {
  it('asRateCode يرفع الأحرف ويرفض غير النصوص', () => {
    expect(asRateCode('usd')).toBe('USD');
    expect(asRateCode(null)).toBe('');
    expect(asRateCode(123)).toBe('');
  });

  it('asRateValue يرفض NaN وغير الأرقام ويقبل الأصفار', () => {
    expect(asRateValue(3.75)).toBe(3.75);
    expect(asRateValue(Number.NaN)).toBe(0);
    expect(asRateValue('3.75')).toBe(0);
    expect(asRateValue(0)).toBe(0);
  });
});

describe('normalizeComparisonSupplier — تطبيع استجابة الـ API', () => {
  it('يرفض الصفوف غير الكائنية أو بلا معرّف', () => {
    expect(normalizeComparisonSupplier(null)).toBeNull();
    expect(normalizeComparisonSupplier('x')).toBeNull();
    expect(normalizeComparisonSupplier({ id: '' })).toBeNull();
  });

  it('يعتمد الريال السعودي افتراضياً للعملة والمورد الافتراضي للاسم', () => {
    const result = normalizeComparisonSupplier({ id: 'a', party: {} });
    expect(result?.currency_code).toBe('SAR');
    expect(result?.party?.name).toBe('مورد غير محدد');
    expect(result?.total_amount).toBe(0);
    expect(result?.exchange_rate).toBeNull();
  });

  it('يستخرج القياس ورقم القطعة من كائن المنتج عند توفره', () => {
    const result = normalizeComparisonSupplier({
      id: 'a',
      quotation_items: [
        {
          id: 'i1',
          description: 'فحمات',
          quantity: 2,
          unit_price: 10,
          product: { size: '205', part_number: 'PN-9' },
        },
      ],
    });
    expect(result?.quotation_items[0].size).toBe('205');
    expect(result?.quotation_items[0].part_number).toBe('PN-9');
  });

  it('يتجاهل البنود الفاسدة ويحوّل القيم غير الرقمية إلى صفر', () => {
    const result = normalizeComparisonSupplier({
      id: 'a',
      quotation_items: [
        null,
        'bad',
        { id: 'i1', description: 'بند', quantity: '2', unit_price: null },
      ],
    });
    expect(result?.quotation_items).toHaveLength(1);
    expect(result?.quotation_items[0].quantity).toBe(0);
    expect(result?.quotation_items[0].unit_price).toBe(0);
  });

  it('normalizeComparisonSuppliers يرجع قائمة فارغة لمدخل غير مصفوف', () => {
    expect(normalizeComparisonSuppliers(undefined)).toEqual([]);
    expect(normalizeComparisonSuppliers([{ id: 'a' }, { id: '' }])).toHaveLength(1);
  });
});

const item = (overrides: Partial<ComparisonQuotationItem> = {}): ComparisonQuotationItem => ({
  id: 'i1',
  product_id: null,
  description: 'بند',
  quantity: 1,
  unit_price: 10,
  total: 10,
  size: null,
  part_number: null,
  ...overrides,
});

describe('buildQuotationComparison', () => {
  it('يرجع null عند عدم وجود عروض', () => {
    expect(buildQuotationComparison([], false)).toBeNull();
  });

  it('يجمع الأوصاف الفريدة وأول قياس غير فارغ وأعلى كمية', () => {
    const result = buildQuotationComparison(
      [
        supplier({
          id: 's1',
          quotation_items: [item({ id: '1', description: 'فحمات', quantity: 2 })],
        }),
        supplier({
          id: 's2',
          quotation_items: [
            item({ id: '2', description: 'فحمات', quantity: 5, size: '205', part_number: 'PN' }),
          ],
        }),
      ],
      false
    );
    expect(result?.descriptions).toEqual(['فحمات']);
    expect(result?.itemsMap.get('فحمات')).toEqual({ size: '205', part_number: 'PN', quantity: 5 });
  });

  it('يحدد أرخص مورد لكل بند وأوفر عرض إجمالاً', () => {
    const result = buildQuotationComparison(
      [
        supplier({ id: 'cheap', total_amount: 100, quotation_items: [item({ unit_price: 10 })] }),
        supplier({
          id: 'expensive',
          total_amount: 300,
          quotation_items: [item({ unit_price: 30 })],
        }),
      ],
      false
    );
    expect(result?.cheapestId).toBe('cheap');
    expect(result?.priceMap.get('بند')).toMatchObject({ min: 10, max: 30, minSupplier: 'cheap' });
  });

  it('يرصد تعدد العملات ويحسب الإجماليات المعايرة بالريال', () => {
    const result = buildQuotationComparison(
      [
        supplier({ id: 'a', currency_code: 'SAR', total_amount: 375 }),
        supplier({ id: 'b', currency_code: 'USD', total_amount: 100 }),
      ],
      true
    );
    expect(result?.isMixedCurrencies).toBe(true);
    expect(result?.currencies).toEqual(['SAR', 'USD']);
    expect(result?.normalizedTotals.get('b')).toBeCloseTo(375, 6);
    expect(result?.cheapestId).toBe('a');
  });

  it('لا يوحّد العملات عندما يكون التوحيد معطلاً', () => {
    const result = buildQuotationComparison(
      [
        supplier({ id: 'a', currency_code: 'SAR', total_amount: 375 }),
        supplier({ id: 'b', currency_code: 'USD', total_amount: 100 }),
      ],
      false
    );
    expect(result?.cheapestId).toBe('b');
  });
});

describe('computeTotalDifference', () => {
  it('يرجع null لأقل من عرضين', () => {
    expect(
      computeTotalDifference([supplier()], { isMixedCurrencies: false, normalizeCurrency: false })
    ).toBeNull();
  });

  it('يحسب الفارق بعملة موحدة', () => {
    const diff = computeTotalDifference(
      [supplier({ id: 'a', total_amount: 100 }), supplier({ id: 'b', total_amount: 250 })],
      { isMixedCurrencies: false, normalizeCurrency: false }
    );
    expect(diff).toEqual({ value: 150, currency: 'SAR' });
  });

  it('يرجع null عند تعدد العملات بدون توحيد', () => {
    const diff = computeTotalDifference(
      [
        supplier({ id: 'a', total_amount: 100, currency_code: 'SAR' }),
        supplier({ id: 'b', total_amount: 250, currency_code: 'USD' }),
      ],
      { isMixedCurrencies: true, normalizeCurrency: false }
    );
    expect(diff).toBeNull();
  });

  it('يحسب الفارق معايراً بالريال عند التوحيد', () => {
    const diff = computeTotalDifference(
      [
        supplier({ id: 'a', total_amount: 375, currency_code: 'SAR' }),
        supplier({ id: 'b', total_amount: 100, currency_code: 'USD' }),
      ],
      { isMixedCurrencies: true, normalizeCurrency: true }
    );
    expect(diff?.currency).toBe('SAR');
    expect(diff?.value).toBeCloseTo(0, 6);
  });
});
