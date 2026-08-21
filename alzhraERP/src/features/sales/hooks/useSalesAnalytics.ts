// ============================================
// Sales Analytics Hook
// Hook for fetching sales analytics
// ============================================

import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/features/sales/api';

interface SalesAnalyticsParams {
    companyId: string;
    startDate?: string;
    endDate?: string;
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
}

interface SalesAnalytics {
    totalSales: number;
    totalReturns: number;
    netSales: number;
    invoiceCount: number;
    averageInvoiceValue: number;
    prevTotalSales: number;
    prevTotalReturns: number;
    prevNetSales: number;
    topProducts: Array<{
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
    }>;
    topCustomers: Array<{
        customerId: string;
        customerName: string;
        totalAmount: number;
        invoiceCount: number;
    }>;
    salesByDay: Array<{
        date: string;
        sales: number;
        returns: number;
    }>;
    salesByPaymentMethod: Array<{
        method: string;
        amount: number;
    }>;
}

/**
 * Coerce an unknown value to a finite number, falling back to 0 for
 * null/undefined/NaN/strings so no downstream component renders `NaN`.
 */
const toNum = (value: unknown): number => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Defensively map raw RPC output. The `get_sales_analytics` RPC return is
 * untyped JSON; its sibling RPCs (e.g. get_top_customers_by_revenue) return
 * snake_case fields (name/total_revenue/invoice_count). We accept both
 * camelCase and snake_case so a mismatch never surfaces as `NaN`.
 */
type RawRecord = Record<string, unknown>;

const normalizeAnalytics = (raw: RawRecord | null | undefined): SalesAnalytics | null => {
    if (!raw) return null;

    const numberField = (name: string, snakeName?: string): number => {
        const fallback = snakeName !== undefined ? raw[snakeName] : undefined;
        return toNum(raw[name] ?? fallback);
    };

    const listField = (key: string, snakeKey: string): RawRecord[] =>
        Array.isArray(raw[key]) ? raw[key] as RawRecord[]
        : Array.isArray(raw[snakeKey]) ? raw[snakeKey] as RawRecord[]
        : [];

    return {
        totalSales: numberField('totalSales', 'total_sales'),
        totalReturns: numberField('totalReturns', 'total_returns'),
        netSales: numberField('netSales', 'net_sales'),
        invoiceCount: numberField('invoiceCount', 'invoice_count'),
        averageInvoiceValue: numberField('averageInvoiceValue', 'average_invoice_value'),
        prevTotalSales: numberField('prevTotalSales', 'prev_total_sales'),
        prevTotalReturns: numberField('prevTotalReturns', 'prev_total_returns'),
        prevNetSales: numberField('prevNetSales', 'prev_net_sales'),

        topProducts: listField('topProducts', 'top_products').map((p: RawRecord, i: number) => ({
            productId: String(p.productId ?? p.product_id ?? p.id ?? `prod-${i}`),
            productName: String(p.productName ?? p.product_name ?? p.name ?? p.name_ar ?? 'غير معروف'),
            quantity: toNum(p.quantity ?? p.total_quantity),
            revenue: toNum(p.revenue ?? p.total_revenue),
        })),

        topCustomers: listField('topCustomers', 'top_customers').map((c: RawRecord, i: number) => ({
            customerId: String(c.customerId ?? c.customer_id ?? c.id ?? `cust-${i}`),
            customerName: String(c.customerName ?? c.customer_name ?? c.name ?? 'غير معروف'),
            totalAmount: toNum(c.totalAmount ?? c.total_revenue ?? c.total_amount ?? c.total),
            invoiceCount: toNum(c.invoiceCount ?? c.invoice_count ?? c.invoices),
        })),

        salesByDay: listField('salesByDay', 'sales_by_day').map((d: RawRecord) => ({
            date: String(d.date ?? d.label ?? ''),
            sales: toNum(d.sales ?? d.total_sales ?? d.amount),
            returns: toNum(d.returns ?? d.return_amount),
        })),

        salesByPaymentMethod: listField('salesByPaymentMethod', 'sales_by_payment_method').map((m: RawRecord) => ({
            method: String(m.method ?? m.payment_method ?? 'unknown'),
            amount: toNum(m.amount ?? m.total_amount ?? m.value),
        })),
    };
};

export const useSalesAnalytics = (params: SalesAnalyticsParams) => {
    const { companyId, startDate, endDate, period = 'month' } = params;

    const queryKey = [
        'sales_analytics',
        companyId,
        { startDate, endDate, period }
    ] as const;

    const {
        data,
        isLoading,
        isError,
        error,
        refetch,
        isFetching
    } = useQuery({
        queryKey,
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        queryFn: async () => {
            if (!companyId) {
                return null;
            }

            const payload: { company_id: string; start_date?: string; end_date?: string } = {
                company_id: companyId,
            };
            if (startDate) payload.start_date = startDate;
            if (endDate) payload.end_date = endDate;

            const { data: analytics, error } = await salesApi.getSalesAnalytics(payload);

            if (error) {
                throw new Error(error.message || 'Failed to fetch sales analytics');
            }

            // RPC يعيد Json — نضيّق النوع إلى كائن قبل التطبيع
            const rawRecord = (analytics !== null && typeof analytics === 'object' && !Array.isArray(analytics))
                ? analytics as unknown as RawRecord
                : null;
            return normalizeAnalytics(rawRecord);
        },
        enabled: !!companyId,
    });

    return {
        analytics: data,
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
        // Convenience getters
        totalSales: data?.totalSales ?? 0,
        totalReturns: data?.totalReturns ?? 0,
        netSales: data?.netSales ?? 0,
        invoiceCount: data?.invoiceCount ?? 0,
        averageInvoiceValue: data?.averageInvoiceValue ?? 0,
        prevTotalSales: data?.prevTotalSales ?? 0,
        prevTotalReturns: data?.prevTotalReturns ?? 0,
        prevNetSales: data?.prevNetSales ?? 0,
        topProducts: data?.topProducts ?? [],
        topCustomers: data?.topCustomers ?? [],
        salesByDay: data?.salesByDay ?? [],
        salesByPaymentMethod: data?.salesByPaymentMethod ?? [],
    };
};

export default useSalesAnalytics;
