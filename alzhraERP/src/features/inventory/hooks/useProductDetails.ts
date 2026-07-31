import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api';
import { Product } from '../types';

export const useProductDetails = (product: Product | null) => {
    const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
        queryKey: ['product_analytics', product?.id],
        queryFn: async () => {
            if (!product?.id) return null;
            const { data, error } = await inventoryApi.getProductAnalytics(product.id);
            const safeData = data as Record<string, unknown> | null;
            if (!error && safeData) return safeData;

            // Fallback to movements if RPC fails
            const { data: txs } = await inventoryApi.getProductMovements(product.id);
            if (!txs) return null;

            const sales = txs.filter((t: any) => t.transaction_type === 'out').reduce((sum: number, t: any) => sum + (t.quantity || 0), 0);
            const purchases = txs.filter((t: any) => t.transaction_type === 'in').reduce((sum: number, t: any) => sum + (t.quantity || 0), 0);

            return { total_sales_qty: sales, total_purchases_qty: purchases, total_profit: 0, total_loss: 0 };
        },
        enabled: !!product?.id
    });

    const stats = {
        total_sales: (analytics as any)?.total_quantity_sold ?? (analytics as any)?.total_sales_qty ?? product?.total_sales_qty ?? 0,
        total_purchases: (analytics as any)?.total_purchases_qty ?? product?.total_purchases_qty ?? 0,
        profit: (analytics as any)?.total_profit ?? product?.total_profit ?? 0,
        loss: product?.total_loss ?? 0,
    };

    const cost = Number(product?.cost_price) || 0;
    const selling = Number(product?.sale_price ?? product?.selling_price) || 0;
    const margin = cost > 0 ? ((selling - cost) / cost) * 100 : 0;

    const { data: supplierData, isLoading: isSupplierLoading } = useQuery({
        queryKey: ['supplier', product?.supplier_id],
        queryFn: () => product?.supplier_id ? inventoryApi.getSupplier(product.supplier_id) : Promise.resolve(null),
        enabled: !!product?.supplier_id
    });

    const supplierName = (supplierData?.data as any)?.name || product?.supplier_name || 'غير محدد';

    return {
        analytics,
        stats,
        margin,
        supplierName,
        isLoading: isAnalyticsLoading || isSupplierLoading,
        selling
    };
};
