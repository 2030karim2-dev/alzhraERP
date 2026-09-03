import { describe, it, expect } from 'vitest';
import { netUnitPrices } from './invoiceDiscount';

describe('netUnitPrices', () => {
  it('يُبقي الأسعار دون تغيير عند غياب الخصم', () => {
    const items = [
      { productId: 'a', quantity: 2, unitPrice: 10 },
      { productId: 'b', quantity: 1, unitPrice: 30 },
    ];

    const out = netUnitPrices(items, 0);

    expect(out[0].unitPrice).toBe(10);
    expect(out[1].unitPrice).toBe(30);
  });

  it('يوزّع الخصم تناسبياً بحيث يبقى مجموع البنود = الإجمالي - الخصم', () => {
    const items = [
      { productId: 'a', quantity: 2, unitPrice: 10 }, // 20 من 50
      { productId: 'b', quantity: 1, unitPrice: 30 }, // 30 من 50
    ];

    const out = netUnitPrices(items, 5);

    // السطر الأول خصمه 2 (20/50 من 5) → صافي 18 ÷ 2 = 9
    expect(out[0].unitPrice).toBe(9);
    // السطر الثاني خصمه 3 → صافي 27
    expect(out[1].unitPrice).toBe(27);

    const netTotal = out.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    expect(netTotal).toBeCloseTo(45, 4);
  });

  it('يضع سقفاً للخصم عند قيمة الفاتورة كاملة (لا إجمالي سالب)', () => {
    const items = [{ productId: 'a', quantity: 2, unitPrice: 10 }];

    const out = netUnitPrices(items, 999);

    expect(out[0].unitPrice).toBe(0);
    expect(out[0].quantity).toBe(2);
  });

  it('يتجاهل البنود ذات كمية صفر ولا يقسم على صفر', () => {
    const items = [
      { productId: 'a', quantity: 0, unitPrice: 10 },
      { productId: 'b', quantity: 2, unitPrice: 5 },
    ];

    const out = netUnitPrices(items, 2);

    expect(out[0].unitPrice).toBe(10); // بند الكمية صفر يبقى دون تغيير
    expect(out[1].unitPrice).toBe(4); // (10 - 2) / 2
  });

  it('يتعامل مع قيم NaN/سلبية للخصم كأنه لا يوجد خصم', () => {
    const items = [{ productId: 'a', quantity: 1, unitPrice: 10 }];

    expect(netUnitPrices(items, Number.NaN)[0].unitPrice).toBe(10);
    expect(netUnitPrices(items, -7)[0].unitPrice).toBe(10);
  });
});
