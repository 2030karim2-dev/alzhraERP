import { formatCurrency } from '../../../core/utils/currencyUtils';

export const calculateDashboardInsights = (data: {
    receiptBonds: number;
    paymentBonds: number;
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    netProfit: number;
    totalSupplierDebts: number;
    salesChartData?: Array<{ sales?: number; purchases?: number; expenses?: number; value?: number }>;
    lowStockProducts: Array<{ id: string; name?: string }>;
    overdueInvoices: Array<{ id: string }>;
}) => {
    const { 
        totalSales = 0, 
        salesChartData = [], 
        lowStockProducts = [], 
        overdueInvoices = [], 
        totalSupplierDebts = 0
    } = data;

    const totalDebts = totalSupplierDebts ?? 0;

    // Use salesChartData to calculate trends
    // Assuming salesChartData contains 30 days of data ordered chronologically
    const halfLength = Math.max(1, Math.floor(salesChartData.length / 2));
    const olderHalf = salesChartData.slice(0, halfLength);
    const newerHalf = salesChartData.slice(halfLength);

    const getSum = (list: Array<Record<string, unknown>>, key: string) =>
        list.reduce((sum: number, item: Record<string, unknown>) => sum + (Number(item[key]) || 0), 0);

    const olderSales = getSum(olderHalf, 'sales') || getSum(olderHalf, 'value');
    const newerSales = getSum(newerHalf, 'sales') || getSum(newerHalf, 'value');
    const salesTrend = olderSales > 0 ? ((newerSales - olderSales) / olderSales) * 100 : 0;

    const olderPurchases = getSum(olderHalf, 'purchases');
    const newerPurchases = getSum(newerHalf, 'purchases');
    const purchasesTrend = olderPurchases > 0 ? ((newerPurchases - olderPurchases) / olderPurchases) * 100 : 0;

    const olderExpenses = getSum(olderHalf, 'expenses');
    const newerExpenses = getSum(newerHalf, 'expenses');
    const expensesTrend = olderExpenses > 0 ? ((newerExpenses - olderExpenses) / olderExpenses) * 100 : 0;

    const alerts = [];
    if (lowStockProducts && lowStockProducts.length > 0) {
        alerts.push({
            id: 'low-stock',
            type: 'urgent' as const,
            message: `${lowStockProducts.length} منتجات قاربت على النفاد`,
            time: 'الآن'
        });
    }

    if (overdueInvoices.length > 0) {
        alerts.push({
            id: 'overdue-invoices',
            type: 'warning' as const,
            message: `${overdueInvoices.length} فواتير متأخرة التحصيل`,
            time: 'تحتاج متابعة'
        });
    }

    if (totalDebts > 0) {
        alerts.push({
            id: 'debts',
            type: 'info' as const,
            message: `إجمالي المستحقات: ${formatCurrency(totalDebts)}`,
            time: 'قيد التحصيل'
        });
    }

    const insights = [];
    if (salesTrend > 0) {
        insights.push({
            id: 'sales-trend',
            type: 'success' as const,
            message: `المبيعات أعلى بـ ${salesTrend.toFixed(0)}% من الفترة السابقة`,
            detail: 'أداء ممتاز!'
        });
    }

    if (lowStockProducts && lowStockProducts.length > 0) {
        insights.push({
            id: 'stock-alert',
            type: 'warning' as const,
            message: `${lowStockProducts.length} منتجات قاربت على النفاد`,
            detail: 'تحقق من المخزون'
        });
    }

    const collectionRate = totalSales > 0 ? ((totalSales - totalDebts) / totalSales) * 100 : 0;
    if (collectionRate < 80) {
        insights.push({
            id: 'collection',
            type: 'info' as const,
            message: `${overdueInvoices.length} فواتير متأخرة التحصيل`,
            detail: `المجموع: ${formatCurrency(totalDebts)}`
        });
    }

    const salesProgress = totalSales > 0 ? Math.min(100, (totalSales / 100000) * 100) : 0;
    insights.push({
        id: 'target',
        type: 'target' as const,
        message: `تم تحقيق ${salesProgress.toFixed(0)}% من هدف المبيعات`,
        detail: salesProgress > 80 ? 'قريب من الهدف!' : 'استمر في العمل'
    });

    return {
        salesTrend,
        purchasesTrend,
        expensesTrend,
        alerts,
        insights,
        targets: {
            salesProgress: Math.round(salesProgress),
            collectionRate: Math.round(collectionRate)
        },
        olderSales,
        olderPurchases,
        olderExpenses,
        newerSales,
        newerPurchases,
        newerExpenses
    };
};
