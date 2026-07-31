import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';

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

/**
 * Hook to fetch stock availability for a product across all warehouses/branches
 */
export function useWarehouseStock(productId: string | null) {
    const [stockData, setStockData] = useState<WarehouseStockInfo[]>([]);
    const [branchGroups, setBranchGroups] = useState<BranchStockGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuthStore();

    const fetchStock = useCallback(async () => {
        if (!productId || !user?.company_id) {
            setStockData([]);
            setBranchGroups([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Fetch product stock with warehouse and branch info
            const { data, error: stockError } = await supabase
                .from('product_stock')
                .select(`
          quantity,
          warehouse_id,
          warehouses!inner(
            id,
            name_ar,
            branch_id,
            branches:branch_id(
              id,
              name
            )
          )
        `)
                .eq('product_id', productId)
                .gt('quantity', 0);

            if (stockError) throw stockError;

            const mapped: WarehouseStockInfo[] = (data || []).map((item: any) => ({
                warehouse_id: item.warehouse_id,
                warehouse_name: item.warehouses?.name_ar || 'مستودع',
                quantity: Number(item.quantity) || 0,
                branch_id: item.warehouses?.branch_id || null,
                branch_name: item.warehouses?.branches?.name || '',
            }));

            setStockData(mapped);

            // Group by branch
            const branchMap = new Map<string, BranchStockGroup>();

            // Add "No Branch" group for warehouses without branches
            branchMap.set('__no_branch__', {
                branch_id: '__no_branch__',
                branch_name: 'بدون فرع',
                warehouses: [],
                total_quantity: 0,
            });

            for (const wh of mapped) {
                const key = wh.branch_id || '__no_branch__';
                if (!branchMap.has(key)) {
                    branchMap.set(key, {
                        branch_id: key,
                        branch_name: wh.branch_name || 'فرع',
                        warehouses: [],
                        total_quantity: 0,
                    });
                }
                const group = branchMap.get(key)!;
                group.warehouses.push(wh);
                group.total_quantity += wh.quantity;
            }

            setBranchGroups(Array.from(branchMap.values()));
        } catch (err: any) {
            console.error('useWarehouseStock error:', err);
            setError(err.message || 'فشل في تحميل بيانات المخزون');
        } finally {
            setIsLoading(false);
        }
    }, [productId, user?.company_id]);

    useEffect(() => {
        fetchStock();
    }, [fetchStock]);

    return {
        stockData,
        branchGroups,
        isLoading,
        error,
        refetch: fetchStock,
    };
}

/**
 * Hook to fetch all warehouses with their branch info for the POS filter
 */
export function useWarehousesWithBranches() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user?.company_id) return;

        setIsLoading(true);
        supabase
            .from('warehouses')
            .select(`
        id,
        name_ar,
        location,
        branch_id,
        branches:branch_id(
          id,
          name
        )
      `)
            .eq('company_id', user.company_id)
            .is('deleted_at', null)
            .then((result: { data: any; error: any }) => {
                if (result.error) {
                    console.error('useWarehousesWithBranches error:', result.error);
                    return;
                }
                setWarehouses(result.data || []);
            })
            .finally(() => setIsLoading(false));
    }, [user?.company_id]);

    return { warehouses, isLoading };
}