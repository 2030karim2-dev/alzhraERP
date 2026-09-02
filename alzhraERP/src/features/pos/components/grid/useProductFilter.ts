import { useMemo } from 'react';
import type { Product } from '../../../inventory/types';

interface UseProductFilterProps {
  products: Product[] | undefined;
  selectedCategory: string | null;
  inStockOnly: boolean;
  selectedWarehouseId?: string | null;
}

export function useProductFilter({
  products,
  selectedCategory,
  inStockOnly,
  selectedWarehouseId,
}: UseProductFilterProps): Product[] {
  return useMemo(() => {
    const base = Array.isArray(products) ? products : [];
    let result = base.filter(p =>
      selectedCategory != null ? p.category_id === selectedCategory : true
    );
    if (inStockOnly) {
      result = result.filter(p => (p.stock_quantity ?? 0) > 0);
    }
    if (selectedWarehouseId != null) {
      result = result.filter(p => {
        const dist = Array.isArray(p.warehouse_distribution) ? p.warehouse_distribution : [];
        const whStock = dist.find(w => w.warehouse_id === selectedWarehouseId);
        // The warehouse filter scopes the grid to products present at the
        // selected warehouse. Only enforce `quantity > 0` when the
        // operator explicitly enabled "In Stock Only" — otherwise a
        // zero-stock product at this warehouse must still be visible.
        if (inStockOnly) return whStock != null && whStock.quantity > 0;
        return whStock != null;
      });
    }
    return result;
  }, [products, selectedCategory, inStockOnly, selectedWarehouseId]);
}
