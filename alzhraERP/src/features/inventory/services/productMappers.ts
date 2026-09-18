import type { Product } from '../types';

interface RawStock {
  quantity?: number | string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouses?: {
    name_ar?: string;
    branch_id?: string;
    branches?: { id?: string; name?: string } | null;
  };
}

interface RawProduct {
  id: string;
  company_id: string;
  name_ar: string;
  sku?: string;
  part_number?: string;
  brand?: string;
  category?: { id: string; name: string } | null;
  category_id?: string;
  size?: string;
  description?: string;
  purchase_price?: number | string;
  sale_price?: number | string;
  min_stock_level?: number | string;
  is_core?: boolean;
  unit?: string;
  image_url?: string | null;
  alternative_numbers?: string | null;
  barcode?: string | null;
  updated_at: string;
  created_at?: string;
  stock?: RawStock[];
  status?: string;
  location?: string;
  uoms?: Array<{ id: string; uom_name: string; conversion_factor: number }>;
  total_purchases_qty?: number | string;
  total_sales_qty?: number | string;
  total_profit?: number | string;
  total_loss?: number | string;
  last_invoice_date?: string | null;
}

/**
 * Maps raw DB rows (arbitrary shape) to the Product domain type.
 * Used both internally and by the paginated hook.
 * @param warehouseId Optional. If provided, `stock_quantity` will reflect ONLY this warehouse's stock.
 */
export function mapRawProducts(rows: unknown[], warehouseId?: string): Product[] {
  return (rows as RawProduct[])
    .map(prod => {
      if (!prod?.id) return null;

      const stockList = Array.isArray(prod.stock) ? prod.stock : [];

      // Warehouse Isolation Fix: Calculate total stock based on warehouseId if provided
      const relevantStockList = warehouseId
        ? stockList.filter(s => s.warehouse_id === warehouseId)
        : stockList;

      const totalStock = relevantStockList.reduce((sum: number, s: RawStock) => {
        const qty = Number(s.quantity);
        return sum + (isNaN(qty) ? 0 : qty);
      }, 0);

      const warehouseDistribution = stockList.map(s => ({
        warehouse_id: s.warehouse_id,
        warehouse_name: s.warehouse_name || s.warehouses?.name_ar || 'مستودع غير معروف',
        branch_id: s.warehouses?.branch_id || s.warehouses?.branches?.id,
        branch_name: s.warehouses?.branches?.name,
        quantity: Number(s.quantity) || 0,
      }));

      const categoryName = prod.category?.name || 'عام';

      return {
        id: prod.id,
        company_id: prod.company_id,
        name_ar: prod.name_ar || 'منتج غير مسمى',
        name_en: '',
        name: prod.name_ar || 'منتج غير مسمى',
        sku: prod.sku || '---',
        part_number: prod.part_number || '---',
        brand: prod.brand || '',
        category: categoryName,
        category_id: prod.category_id || null,
        size: prod.size || '',
        specifications: prod.description || '',
        cost_price: Number(prod.purchase_price) || 0,
        sale_price: Number(prod.sale_price) || 0,
        selling_price: Number(prod.sale_price) || 0,
        stock_quantity: totalStock,
        warehouse_distribution: warehouseDistribution,
        min_stock_level: Number(prod.min_stock_level) || 0,
        is_core: Boolean(prod.is_core),
        unit: prod.unit || 'pcs',
        uoms: (prod.uoms || []).map(u => ({
          id: u.id,
          uom_name: u.uom_name,
          conversion_factor: u.conversion_factor,
        })),
        image_url: prod.image_url || null,
        alternative_numbers: prod.alternative_numbers || null,
        barcode: prod.barcode || null,
        location: (() => {
          const warehouseNames = stockList
            .map((s: RawStock) => s.warehouse_name || s.warehouses?.name_ar)
            .filter(Boolean) as string[];
          const uniqueWarehouses = [...new Set(warehouseNames)].join(', ');
          const shelfLocation = prod.location || '';
          if (uniqueWarehouses && shelfLocation) return `${uniqueWarehouses} (${shelfLocation})`;
          return uniqueWarehouses || shelfLocation || '—';
        })(),
        created_at: prod.created_at || new Date().toISOString(),
        isLowStock: (() => {
          const minLevel = Number(prod.min_stock_level) || 0;
          if (prod.is_core) {
            return minLevel > 0 ? totalStock <= minLevel : totalStock <= 3;
          }
          return minLevel > 0 && totalStock <= minLevel;
        })(),
        alternatives: prod.alternative_numbers
          ? prod.alternative_numbers.split(',').map(n => n.trim())
          : [],
        compatibility: [],
        total_purchases_qty: Number(prod.total_purchases_qty) || 0,
        total_sales_qty: Number(prod.total_sales_qty) || 0,
        total_profit: Number(prod.total_profit) || 0,
        total_loss: Number(prod.total_loss) || 0,
        last_invoice_date: prod.last_invoice_date || undefined,
      };
    })
    .filter((p): p is Product => p !== null);
}
