import { supabase } from '../../../lib/supabaseClient';

/** Analytics and reporting functions */
export const analyticsApi = {
    getInventoryAnalytics: async (companyId: string, from?: string, to?: string) => {
        let query = supabase.from('invoice_items')
            .select(`
        quantity,
        unit_price,
        total,
        product_id,
        products!inner(id, name_ar, sku, purchase_price),
        invoices!inner(id, issue_date, type, status)
      `)
            .eq('invoices.company_id', companyId)
            .neq('invoices.status', 'void')
            .in('invoices.type', ['sale', 'return_sale']);

        if (from) {
            query = query.gte('invoices.issue_date', from);
        }
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            query = query.lte('invoices.issue_date', toDate.toISOString());
        }

        return await query;
    },

    getDeadStock: async (daysThreshold: number) => {
        return await supabase.rpc('get_dead_stock', { days_threshold: daysThreshold });
    },

    getProductAnalytics: async (productId: string) => {
        const { data, error } = await supabase
            .from('invoice_items')
            .select(`
                quantity,
                total,
                invoices!inner(issue_date, type, status)
            `)
            .eq('product_id', productId)
            .neq('invoices.status', 'void');

        if (error) return { data: null, error };

        const rows = (data || []) as Array<{
            quantity?: number | null;
            total?: number | null;
            invoices?: { issue_date?: string | null; type?: string | null } | null;
        }>;

        let totalQuantitySold = 0;
        let totalRevenue = 0;
        let lastSaleDate: string | null = null;

        rows.forEach((row) => {
            const multiplier = row.invoices?.type === 'return_sale' ? -1 : 1;
            totalQuantitySold += (Number(row.quantity) || 0) * multiplier;
            totalRevenue += (Number(row.total) || 0) * multiplier;

            if (row.invoices?.issue_date && (!lastSaleDate || row.invoices.issue_date > lastSaleDate)) {
                lastSaleDate = row.invoices.issue_date;
            }
        });

        return {
            data: {
                total_quantity_sold: totalQuantitySold,
                total_revenue: totalRevenue,
                transaction_count: rows.length,
                last_sale_date: lastSaleDate,
            },
            error: null,
        };
    },

    getLowStockProducts: async (companyId: string) => {
        return await supabase.rpc('get_low_stock_products', { p_company_id: companyId });
    },
};
