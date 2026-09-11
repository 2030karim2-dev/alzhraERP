import { describe, expect, it } from 'vitest';
import { getWarehouseStock, type SearchResult } from './AuditSearchPanel';

const base: SearchResult = {
  id: 'p1',
  name_ar: 'صنف اختبار',
  sku: 'SKU-1',
  stock_quantity: 10,
  warehouse_distribution: [
    { warehouse_id: 'w1', quantity: 4 },
    { warehouse_id: 'w2', quantity: 6 },
  ],
};

describe('getWarehouseStock — كمية الصنف في المستودع المحدد', () => {
  it('يعيد كمية المستودع المحدد من التوزيع', () => {
    expect(getWarehouseStock(base, 'w1')).toBe(4);
    expect(getWarehouseStock(base, 'w2')).toBe(6);
  });

  it('يعيد 0 عندما لا يوجد الصنف في المستودع المحدد', () => {
    expect(getWarehouseStock(base, 'w-missing')).toBe(0);
  });

  it('يعيد null قبل اختيار مستودع (بدل رقم إجمالي مضلل)', () => {
    expect(getWarehouseStock(base, '')).toBeNull();
  });

  it('يتعامل مع غياب التوزيع بدون انفجار', () => {
    const noDist: SearchResult = { ...base, warehouse_distribution: undefined };
    expect(getWarehouseStock(noDist, 'w1')).toBe(0);
  });

  it('يعامل القيم غير الرقمية في التوزيع كصفر', () => {
    const weird: SearchResult = {
      ...base,
      warehouse_distribution: [
        // محاكاة قيمة قادمة من JSON كسلسلة/غير رقمية
        { warehouse_id: 'w1', quantity: Number('not-a-number') },
      ],
    };
    expect(getWarehouseStock(weird, 'w1')).toBe(0);
  });
});
