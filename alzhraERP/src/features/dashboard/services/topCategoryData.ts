import type { ChartDataPoint } from '../models';

/**
 * تجميع أعلى المنتجات مبيعاً حسب فئتها (product_categories) لإطعام بطاقة
 * "التصنيفات الأكثر حركة". المصدر: `get_top_selling_products` + جدول
 * `product_categories` — بدلاً من فئات المصاريف التي كانت تُعرض سابقاً.
 */
export const buildTopCategoryData = (
  topSellingProducts: Array<{
    category_id: string;
    id: string;
    name_ar?: string;
    total_revenue?: number;
    total_sold?: number;
  }> | undefined | null,
  productCategories: Array<{ id: string; name: string }> | undefined | null,
): ChartDataPoint[] => {
  const products = Array.isArray(topSellingProducts) ? topSellingProducts : [];
  const categories = Array.isArray(productCategories) ? productCategories : [];
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const byCategory = new Map<string, number>();
  for (const p of products) {
    if (!p.category_id) continue;
    const revenue = Number(p.total_revenue) || 0;
    byCategory.set(p.category_id, (byCategory.get(p.category_id) ?? 0) + revenue);
  }

  return [...byCategory.entries()]
    .map(([id, value]) => ({
      name: categoryName.get(id) ?? 'غير مصنف',
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
};
