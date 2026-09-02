import { describe, it, expect } from 'vitest';
import { mergeMatchingAndLinkedProducts } from './InventoryMatchTab';
import type { MatchingInventoryProduct, VehicleProductLink } from '../types';

describe('mergeMatchingAndLinkedProducts', () => {
  it('correctly merges matching products from graph and linked products with full names', () => {
    const matching: MatchingInventoryProduct[] = [
      {
        product_id: 'p1',
        sku: 'SKU-001',
        part_number: '11115-37051',
        name_ar: 'باكن راس باص نوها',
        brand: 'TOYOTA',
        sale_price: 120,
        status: 'active',
        compatibility_status: 'CONFIRMED',
        match_source: 'رسم بياني',
      },
    ];

    const linked: VehicleProductLink[] = [
      {
        id: 'link-1',
        vehicle_id: 'v1',
        product_id: 'p1',
        fitment_status: 'CONFIRMED',
        source: 'vin_extract',
        product: {
          id: 'p1',
          name_ar: 'باكن راس باص نوها 2011 دبل',
          sku: 'SKU-001',
          part_number: '11115-37051',
          brand: 'TOYOTA',
          sale_price: 120,
          quantity: 5,
        },
      },
      {
        id: 'link-2',
        vehicle_id: 'v1',
        product_id: 'p2',
        fitment_status: 'CONFIRMED',
        source: 'manual',
        product: {
          id: 'p2',
          name_ar: 'كرسي مكينه يمين باص نوها 2011',
          sku: 'SKU-002',
          part_number: '12305-37021',
          brand: 'TOYOTA',
          sale_price: 250,
          quantity: 2,
        },
      },
    ];

    const result = mergeMatchingAndLinkedProducts(matching, linked);

    expect(result.length).toBe(2);
    expect(result[0].product_id).toBe('p1');
    expect(result[0].link_id).toBe('link-1');
    expect(result[0].quantity).toBe(5);

    expect(result[1].product_id).toBe('p2');
    expect(result[1].name_ar).toBe('كرسي مكينه يمين باص نوها 2011');
    expect(result[1].sku).toBe('SKU-002');
    expect(result[1].link_id).toBe('link-2');
    expect(result[1].quantity).toBe(2);
  });

  it('handles fallback gracefully when product relation is null', () => {
    const linked: VehicleProductLink[] = [
      {
        id: 'link-99',
        vehicle_id: 'v1',
        product_id: 'add82e4a-1234',
        fitment_status: 'CONFIRMED',
        source: 'manual',
        product: null,
      },
    ];

    const result = mergeMatchingAndLinkedProducts([], linked);

    expect(result.length).toBe(1);
    expect(result[0].product_id).toBe('add82e4a-1234');
    expect(result[0].name_ar).toBe('منتج (add82e4a)');
    expect(result[0].link_id).toBe('link-99');
  });
});
