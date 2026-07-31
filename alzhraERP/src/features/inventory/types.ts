
export type InventoryView = 'products' | 'warehouses' | 'low-stock' | 'transfers' | 'audit' | 'analysis';

export interface CarCompatibility {
  make: string;
  model: string;
  years: string[];
}

export interface warehouseStock {
  warehouse_id: string; // Added warehouse_id
  warehouse_name: string;
  quantity: number;
  location: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  submodel?: string | null;
  year_start: number;
  year_end: number;
  body_type?: string | null;
  engine?: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
  drive_type?: string | null;
  vin_prefix?: string | null;
  region?: string | null;
}

export interface ProductFitment {
  id: string;
  product_id: string;
  vehicle_id: string;
  company_id?: string;
  vehicle?: Vehicle;
  notes?: string | null;
  created_at?: string;
}

export interface ProductCrossReference {
  id: string;
  company_id: string;
  base_product_id: string;
  alternative_product_id: string;
  alternative_product?: Product;
  match_quality: 'exact' | 'partial' | 'interchangeable';
  notes?: string | null;
  created_at: string;
  created_by?: string;
}

export interface ProductKitItem {
  id: string;
  kit_product_id: string;
  component_product_id: string;
  component_product?: Product;
  quantity: number;
  created_at: string;
}

export interface ProductUOM {
  id?: string;
  product_id?: string;
  uom_name: string;
  conversion_factor: number;
  barcode?: string;
  sale_price?: number;
}

export interface ProductSupplierPrice {
  id: string;
  company_id: string;
  product_id: string;
  supplier_id: string;
  supplier_name?: string;
  cost_price: number;
  lead_time_days?: number | null;
  supplier_part_number?: string | null;
  notes?: string | null;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  name_ar: string;
  name_en?: string | null | undefined;
  sku: string;
  part_number: string | null;
  alternative_numbers: string | null; // Added for Cross-Reference
  brand: string | null;
  manufacturer?: string | undefined; // Potential alias for brand
  supplier_id?: string | null | undefined; // Foreign Key
  supplier_name?: string | null | undefined; // Added to fix build error
  category: string | null;
  category_id?: string | null | undefined;
  size: string | null;
  specifications: string | null;
  cost_price: number;
  sale_price: number;
  selling_price?: number; // Alias for sale_price (deprecated)
  purchase_price?: number;
  stock_quantity: number; // Computed from product_stock aggregation
  min_stock_level: number;
  unit: string;
  image_url?: string | null | undefined;
  warehouse_distribution?: Array<{ warehouse_id: string; warehouse_name: string; quantity: number }>;

  // Auto Parts Specific Features
  is_kit?: boolean | undefined;
  has_core_charge?: boolean | undefined;
  core_charge_amount?: number | undefined;

  // Analytics (Computed/RPC)
  total_sales_qty?: number | undefined;
  total_purchases_qty?: number | undefined;
  total_profit?: number | undefined;
  total_loss?: number | undefined;
  last_invoice_date?: string | undefined;
  isLowStock?: boolean | undefined;

  // Relations
  warehouse_distribution?: Array<{
    warehouse_id: string;
    warehouse_name: string;
    quantity: number;
    location: string;
  }> | undefined;

  created_at: string;
  updated_at?: string;

  alternatives?: string[] | undefined;
  cross_references?: ProductCrossReference[] | undefined;
  kit_components?: ProductKitItem[] | undefined;
  supplier_prices?: ProductSupplierPrice[] | undefined;
  compatibility?: CarCompatibility[] | undefined;

  location?: string | undefined;
  locations?: {
    warehouse_id: string;
    aisle: string;
    shelf: string;
    bin: string;
  }[] | undefined;
  uoms?: ProductUOM[] | undefined;
}

export interface ProductFormData {
  name: string;
  name_ar?: string | undefined;
  name_en?: string | undefined;
  sku?: string | null | undefined;
  part_number?: string | null | undefined;
  brand?: string | null | undefined;
  size?: string | null | undefined;
  specifications?: string | null | undefined;
  alternative_numbers?: string | null | undefined;
  image_url?: string | null | undefined;
  barcode?: string | null | undefined;
  cost_price?: number | string | null | undefined;
  selling_price?: number | string | null | undefined;
  min_stock_level?: number | string | null | undefined;
  stock_quantity?: number | string | null | undefined;
  location?: string | null | undefined;
  unit?: 'piece' | 'set' | undefined;
  category?: string | undefined;
  is_core?: boolean | undefined;
  uoms?: ProductUOM[] | undefined;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;
  warehouse_id?: string;
}

export interface Warehouse {
  id: string;
  company_id: string;
  branch_id?: string | null;
  name_ar: string;
  name_en?: string | null | undefined;
  location: string | null;
  status: string;
  is_primary?: boolean;
  is_active?: boolean | undefined;
  itemCount?: number;
  totalStock?: number;
  stockValue?: number;
  created_at?: string | undefined;
  updated_at?: string | undefined;
  deleted_at?: string | null;
}

export interface WarehouseFormData {
  name_ar: string;
  name_en?: string;
  location: string;
  is_active?: boolean;
}

export interface StockTransfer {
  id: string;
  company_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: { product_id: string; quantity: number }[];
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface TransferFormData {
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: { product_id: string; quantity: number }[];
  notes?: string;
}

export interface CreateTransferDTO {
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: { product_id: string; quantity: number }[];
  notes?: string;
  company_id: string;
  user_id: string;
}

export interface CreateAuditDTO {
  title: string;
  warehouse_id: string;
  category: string;
}

export interface InventoryAnalysisData {
  summary: {
    stockValue: number;
    turnoverRate: number;
    outOfStockItems: number;
    potentialRevenue: number;
  };
  trendData: { date: string; in: number; out: number }[];
  topMovingItems: { name: string; qty: number; trend: string }[];
  categoryDistribution: { name: string; value: number; fill: string }[];
}

export interface InventoryStats {
  count: number;
  totalValue: number;
  lowStockCount: number;
}

export interface InventoryTransaction {
  company_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  transaction_type: 'purchase' | 'sales' | 'purchase_return' | 'sales_return' | 'transfer_in' | 'transfer_out' | 'adj_in' | 'adj_out' | 'adj' | 'initial';
  reference_type?: string;
  reference_id?: string;
  created_by: string;
  created_at?: Date;
}
