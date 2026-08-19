import { describe, expect, it } from 'vitest';
import { buildTopCategoryData } from './topCategoryData';

describe('buildTopCategoryData', () => {
  it('aggregates top-selling products by category with revenue', () => {
    const result = buildTopCategoryData(
      [
        { id: 'p1', category_id: 'c1', total_revenue: 1000 },
        { id: 'p2', category_id: 'c1', total_revenue: 500 },
        { id: 'p3', category_id: 'c2', total_revenue: 200 },
      ],
      [
        { id: 'c1', name: 'فرامل' },
        { id: 'c2', name: 'فلاتر' },
      ]
    );

    expect(result).toEqual([
      { name: 'فرامل', value: 1500 },
      { name: 'فلاتر', value: 200 },
    ]);
  });

  it('uses a fallback name when the category id is unknown', () => {
    const result = buildTopCategoryData(
      [{ id: 'p1', category_id: 'missing-cat', total_revenue: 999 }],
      [{ id: 'c1', name: 'فرامل' }]
    );

    expect(result).toEqual([{ name: 'غير مصنف', value: 999 }]);
  });

  it('returns an empty array for empty inputs', () => {
    expect(buildTopCategoryData([], [])).toEqual([]);
    expect(buildTopCategoryData(null, null)).toEqual([]);
    expect(buildTopCategoryData(undefined, undefined)).toEqual([]);
  });

  it('sorts categories descending by revenue and keeps only the top 6', () => {
    const products = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      category_id: `c${i}`,
      total_revenue: i * 100,
    }));
    const categories = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, name: `فئة ${i}` }));

    const result = buildTopCategoryData(products, categories);

    expect(result).toHaveLength(6);
    expect(result[0].value).toBe(700); // أعلى فئة
    expect(result[result.length - 1].value).toBe(200);
  });

  it('ignores products without a category id', () => {
    const result = buildTopCategoryData(
      [
        { id: 'p1', category_id: '', total_revenue: 1000 },
        { id: 'p2', category_id: 'c1', total_revenue: 300 },
      ],
      [{ id: 'c1', name: 'فئة 1' }]
    );

    expect(result).toEqual([{ name: 'فئة 1', value: 300 }]);
  });
});
