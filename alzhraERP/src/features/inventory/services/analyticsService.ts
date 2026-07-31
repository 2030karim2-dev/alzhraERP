// Analytics Service - Handles inventory analytics and reporting
import { supabase } from '../../../lib/supabaseClient';
import { inventoryApi } from '../api';

export const analyticsService = {
    /**
     * Get inventory summary statistics
     * Updated: Uses server-side RPC for efficiency
     */
    getInventorySummary: async (companyId: string) => {
        const { data, error } = await supabase.rpc('get_stock_valuation', {
            p_company_id: companyId
        });
        if (error) throw error;

        const result = data as Record<string, number> | null;
        return {
            totalProducts: result?.total_products || 0,
            totalStock: result?.total_stock || 0,
            totalValue: result?.total_value || 0,
            lowStockProducts: 0 // Will be updated by getLowStockProducts if needed
        };
    },

    /**
     * Get low stock products
     */
    getLowStockProducts: async (companyId: string, threshold: number = 10) => {
        const { data, error } = await supabase.from('products')
            .select('id, name_ar, sku, product_stock(quantity)')
            .eq('company_id', companyId);
        if (error) throw error;

        return ((data as { id: string; name_ar: string; sku: string; product_stock?: { quantity?: number }[] }[]) || [])
            .map((p) => {
                const productStock = p.product_stock;
                return {
                    ...p,
                    totalStock: productStock?.reduce((sum: number, s) => sum + (s.quantity || 0), 0) || 0
                };
            })
            .filter((p) => p.totalStock <= threshold)
            .map((p) => ({
                id: p.id,
                name: p.name_ar,
                sku: p.sku,
                currentStock: p.totalStock
            }));
    },

    /**
     * Get inventory value by category
     */
    getInventoryValueByCategory: async (companyId: string) => {
        const { data, error } = await supabase.from('products')
            .select('id, cost_price, category_id, categories(name_ar), product_stock(quantity)')
            .eq('company_id', companyId);
        if (error) throw error;

        const categoryMap = new Map<string, { name: string; value: number; quantity: number }>();

        (data as Record<string, unknown>[])?.forEach((p) => {
            const categoryId = (p.category_id as string) || 'uncategorized';
            const categories = p.categories as { name_ar?: string } | undefined;
            const categoryName = categories?.name_ar || 'غير مصنف';
            const productStock = p.product_stock as { quantity?: number }[] | undefined;
            const stock = productStock?.reduce((sum: number, s) => sum + (s.quantity || 0), 0) || 0;
            const value = stock * ((p.cost_price as number) || 0);

            const existing = categoryMap.get(categoryId) || { name: categoryName, value: 0, quantity: 0 };
            existing.value += value;
            existing.quantity += stock;
            categoryMap.set(categoryId, existing);
        });

        return Array.from(categoryMap.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    },

    /**
     * Get stock movement history
     */
    getStockMovementHistory: async (companyId: string, days: number = 30) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase.from('stock_movements' as any)
            .select('id, type, quantity, created_at, products(name_ar)')
            .eq('company_id', companyId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false });
        if (error) throw error;

        return ((data as any) || []).map((m: any) => {
            const products = m.products as { name_ar?: string } | undefined;
            return {
                id: m.id,
                type: m.type,
                quantity: m.quantity,
                date: m.created_at,
                productName: products?.name_ar
            };
        });
    },

    /**
     * Get top selling products
     */
    getTopSellingProducts: async (companyId: string, limit: number = 10) => {
        const { data, error } = await supabase.rpc('get_top_selling_products', {
            p_company_id: companyId,
            p_limit: limit
        });
        if (error) {
            // Fallback if RPC doesn't exist
            return [];
        }
        return data || [];
    },

    /**
     * Advanced Inventory Analytics with ABC Analysis and Forecasting
     */
    getInventoryAnalytics: async (companyId: string, from?: string, to?: string) => {
        // 1. Fetch Sales Data
        const { data: salesData, error } = await inventoryApi.getInventoryAnalytics(companyId, from, to);
        if (error) throw error;

        const sales = salesData || [];

        // 2. Fetch All Products with Stock for accurate forecasting & stagnant analysis
        const { data: productsData, error: productError } = await inventoryApi.getProducts(companyId);
        if (productError) throw productError;

        const allProducts = ((productsData as Record<string, unknown>[]) || []).map((p) => {
            const stockList = Array.isArray(p.stock) ? p.stock : [];
            const totalStock = stockList.reduce((sum: number, s: Record<string, unknown>) => sum + (Number(s.quantity) || 0), 0);
            return {
                id: p.id as string,
                name: (p.name_ar || p.name) as string,
                sku: (p.sku || '') as string,
                stock_quantity: totalStock,
                cost_price: Number(p.cost_price) || 0,
                selling_price: Number(p.sale_price) || 0,
            };
        });

        // Map to aggregate by Product
        const productStats = new Map<string, {
            id: string;
            name: string;
            sku: string;
            qtySold: number;
            revenue: number;
            cost: number;
            profit: number;
            lastSoldDate: Date | null;
            stock_quantity: number;
            abcCategory?: 'A' | 'B' | 'C';
            dailyVelocity?: number;
            daysRemaining?: number;
        }>();

        // Helper to process sales
        ((sales as Record<string, unknown>[]) || []).forEach((item) => {
            const pid = item.product_id as string;
            const qty = (item.quantity as number) || 0;
            const rev = (item.total as number) || 0;
            const products = item.products as { cost_price?: number; name_ar?: string; sku?: string } | undefined;
            const unitCost = products?.cost_price || 0;
            const cost = unitCost * qty;

            // Handle Returns (negative qty/rev)
            const invoices = item.invoices as { type?: string; issue_date?: string } | undefined;
            const multiplier = invoices?.type === 'return_sale' ? -1 : 1;
            const adjustedQty = qty * multiplier;
            const adjustedRev = rev * multiplier;
            const adjustedCost = cost * multiplier;

            if (!productStats.has(pid)) {
                const productInfo = allProducts.find((p) => p.id === pid);
                productStats.set(pid, {
                    id: pid,
                    name: products?.name_ar || 'Unknown',
                    sku: products?.sku || '---',
                    qtySold: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    lastSoldDate: null,
                    stock_quantity: productInfo?.stock_quantity || 0
                });
            }

            const stats = productStats.get(pid)!;
            stats.qtySold += adjustedQty;
            stats.revenue += adjustedRev;
            stats.cost += adjustedCost;
            stats.profit += (adjustedRev - adjustedCost);

            const saleDate = new Date(invoices?.issue_date || new Date());
            if (!stats.lastSoldDate || saleDate > stats.lastSoldDate) {
                stats.lastSoldDate = saleDate;
            }
        });

        // --- ABC Analysis Implementation ---
        const activeProducts = Array.from(productStats.values());
        const totalRevenue = activeProducts.reduce((sum, item) => sum + item.revenue, 0);

        // Sort by revenue descending
        activeProducts.sort((a, b) => b.revenue - a.revenue);

        let cumulativeRevenue = 0;
        activeProducts.forEach(product => {
            cumulativeRevenue += product.revenue;
            const percentage = cumulativeRevenue / (totalRevenue || 1);

            if (percentage <= 0.80) product.abcCategory = 'A';
            else if (percentage <= 0.95) product.abcCategory = 'B';
            else product.abcCategory = 'C';
        });

        // --- Forecasting Implementation ---
        const endDate = to ? new Date(to) : new Date();
        const startDate = from ? new Date(from) : new Date(new Date().setDate(endDate.getDate() - 30));
        const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

        activeProducts.forEach(product => {
            // Average Daily Sales
            const velocity = Math.max(0, product.qtySold) / daysInPeriod;
            product.dailyVelocity = velocity;

            // Days Inventory Remaining
            if (velocity > 0) {
                product.daysRemaining = Math.floor(product.stock_quantity / velocity);
            } else {
                product.daysRemaining = 999; // Infinite/Stagnant
            }
        });

        // 1. Most Active (Top Sellers)
        const mostActive = [...activeProducts]
            .sort((a, b) => b.qtySold - a.qtySold)
            .slice(0, 10);

        // 2. Most Profitable
        const mostProfitable = [...activeProducts]
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);

        // 3. Stagnant Products
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - 90);

        const stagnant = allProducts.filter((p) => {
            const stats = productStats.get(p.id);
            if (!stats) return true;
            return stats.lastSoldDate ? stats.lastSoldDate < thresholdDate : true;
        }).slice(0, 20).map((p) => ({
            ...p,
            lastSold: productStats.get(p.id)?.lastSoldDate || null
        }));

        // 4. Forecast Alerts (Items running out in < 7 days)
        const stockAlerts = activeProducts
            .filter(p => (p.daysRemaining || 999) < 7 && (p.daysRemaining || 999) > 0)
            .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));

        return {
            mostActive,
            mostProfitable,
            stagnant,
            abcAnalysis: {
                A: activeProducts.filter(p => p.abcCategory === 'A'),
                B: activeProducts.filter(p => p.abcCategory === 'B'),
                C: activeProducts.filter(p => p.abcCategory === 'C'),
            },
            stockAlerts
        };
    }
};

export default analyticsService;
