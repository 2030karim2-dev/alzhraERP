// ============================================
// useWarehouseStock — مخزون منتج عبر المستودعات/الفروع
// أُعيدت كتابته فوق طبقة warehouseApi (Component → Hook → API):
//   * useQuery بدل useState/useEffect (اصطلاح TanStack Query)
//   * فلتر company_id صريح في كل استعلام (عزل المستأجرين)
//   * أنواع مكتوبة (صفر any) + error state حقيقي في الهوك الثاني
// ============================================
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { warehouseApi } from '../api/warehouseApi';

export interface WarehouseStockInfo {
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  branch_id?: string | null;
  branch_name?: string;
}

export interface BranchStockGroup {
  branch_id: string;
  branch_name: string;
  warehouses: WarehouseStockInfo[];
  total_quantity: number;
}

interface StockRow {
  quantity: number;
  warehouse_id: string;
  warehouses: {
    name_ar: string;
    branch_id: string | null;
    branches: { name: string } | null;
  } | null;
}

interface WarehouseBranchRow {
  id: string;
  name_ar: string;
  location: string | null;
  branch_id: string | null;
  branches: { name: string } | null;
}

interface ProductStockResult {
  stock: WarehouseStockInfo[];
  branches: BranchStockGroup[];
}

const NO_BRANCH = '__no_branch__';

const groupByBranch = (items: WarehouseStockInfo[]): BranchStockGroup[] => {
  const branchMap = new Map<string, BranchStockGroup>();
  branchMap.set(NO_BRANCH, {
    branch_id: NO_BRANCH,
    branch_name: 'بدون فرع',
    warehouses: [],
    total_quantity: 0,
  });

  for (const item of items) {
    const key = item.branch_id ?? NO_BRANCH;
    if (!branchMap.has(key)) {
      branchMap.set(key, {
        branch_id: key,
        branch_name: item.branch_name ?? 'فرع',
        warehouses: [],
        total_quantity: 0,
      });
    }
    const group = branchMap.get(key);
    if (group === undefined) continue;
    group.warehouses.push(item);
    group.total_quantity += item.quantity;
  }

  return Array.from(branchMap.values());
};

/**
 * Hook to fetch stock availability for a product across all warehouses/branches.
 */
export function useWarehouseStock(productId: string | null) {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  const query = useQuery({
    queryKey: ['product_stock', companyId, productId],
    queryFn: async (): Promise<ProductStockResult> => {
      if (companyId == null || productId == null) {
        return { stock: [], branches: [] };
      }

      const { data, error } = await warehouseApi.getProductStockByCompany(companyId, productId);
      if (error) throw error;

      const rows = data as StockRow[];
      const mapped: WarehouseStockInfo[] = rows.map(item => ({
        warehouse_id: item.warehouse_id,
        warehouse_name: item.warehouses?.name_ar ?? 'مستودع',
        quantity: item.quantity || 0,
        branch_id: item.warehouses?.branch_id ?? null,
        branch_name: item.warehouses?.branches?.name ?? '',
      }));

      return { stock: mapped, branches: groupByBranch(mapped) };
    },
    enabled: Boolean(companyId) && Boolean(productId),
  });

  return {
    stockData: query.data?.stock ?? [],
    branchGroups: query.data?.branches ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

/**
 * Hook to fetch all warehouses with their branch info for the POS filter.
 */
export function useWarehousesWithBranches() {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  const query = useQuery({
    queryKey: ['warehouses_with_branches', companyId],
    queryFn: async (): Promise<WarehouseBranchRow[]> => {
      if (companyId == null) return [];
      const { data, error } = await warehouseApi.getWarehousesWithBranchesData(companyId);
      if (error) throw error;
      return data as WarehouseBranchRow[];
    },
    enabled: Boolean(companyId),
  });

  return {
    warehouses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
