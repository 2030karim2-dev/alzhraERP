import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api';
import { Product } from '../types';

interface ProductAnalytics {
    total_quantity_sold?: number;
    total_sales_qty?: number;
    total_purchases_qty?: number;
    total_profit?: number;
    total_loss?: number;
    total_revenue?: number;
    history?: number[];
}

export const useProductDetails = (product: Product | null) => {
    const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
        queryKey: ['product_analytics', product?.id],
        queryFn: async () => {
            if (!product?.id) return null;
            const { data, error } = await inventoryApi.getProductAnalytics(product.id);
            if (!error && data) return data as ProductAnalytics;

            // Fallback to movements if RPC fails
            const { data: txs } = await inventoryApi.getProductMovements(product.id);
            if (!txs) return null;

            const sales = txs.filter((t) => t.transaction_type === 'out').reduce((sum, t) => sum + (t.quantity || 0), 0);
            const purchases = txs.filter((t) => t.transaction_type === 'in').reduce((sum, t) => sum + (t.quantity || 0), 0);

            return { total_sales_qty: sales, total_purchases_qty: purchases, total_profit: 0, total_loss: 0 } as ProductAnalytics;
        },
        enabled: !!product?.id
    });

    const a = analytics as ProductAnalytics | null;
    const stats = {
        total_sales: a?.total_quantity_sold ?? a?.total_sales_qty ?? product?.total_sales_qty ?? 0,
        total_purchases: a?.total_purchases_qty ?? product?.total_purchases_qty ?? 0,
        profit: a?.total_profit ?? product?.total_profit ?? 0,
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

    const supplierName = (supplierData as { data?: { name?: string } } | null)?.data?.name || product?.supplier_name || 'غير محدد';

    return {
        analytics,
        stats,
        margin,
        supplierName,
        isLoading: isAnalyticsLoading || isSupplierLoading,
        selling
    };
};
