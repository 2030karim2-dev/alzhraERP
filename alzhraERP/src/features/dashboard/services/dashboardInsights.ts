import { toBaseCurrency, formatCurrency } from '../../../core/utils/currencyUtils';

export const calculateDashboardInsights = (data: {
    receiptBonds: number;
    paymentBonds: number;
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    netProfit: number;
    totalDebts: number;
    totalSupplierDebts: number;
    invoicesData: any[];
    expensesData: any[];
    lowStockProducts: any[];
    overdueInvoices: any[];
}) => {
    const { 
        totalSales = 0, 
        invoicesData = [], 
        expensesData = [], 
        lowStockProducts = [], 
        overdueInvoices = [], 
        totalDebts = 0 
    } = data;

    // Use unified currency utility directly


    const allInvoices = invoicesData || [];
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));

    // Split based on date instead of array length for accuracy
    const olderHalf = allInvoices.filter((i: any) => new Date(i.issue_date) < fifteenDaysAgo);
    const newerHalf = allInvoices.filter((i: any) => new Date(i.issue_date) >= fifteenDaysAgo);

    const getNetSales = (list: any[]) => list.reduce((sum: number, i: any) => {
        const type = i.type?.trim().toLowerCase();
        const amount = toBaseCurrency(i);
        if (type === 'sale') return sum + amount;
        if (['return_sale', 'sale_return', 'sales_return'].includes(type)) return sum - amount;
        return sum;
    }, 0);

    const olderSales = getNetSales(olderHalf);
    const newerSales = getNetSales(newerHalf);
    const salesTrend = olderSales > 0 ? ((newerSales - olderSales) / olderSales) * 100 : 0;

    const getNetPurchases = (list: any[]) => list.reduce((sum: number, i: any) => {
        const type = i.type?.trim().toLowerCase();
        const amount = toBaseCurrency(i);
        if (type === 'purchase') return sum + amount;
        if (['return_purchase', 'purchase_return'].includes(type)) return sum - amount;
        return sum;
    }, 0);

    const olderPurchases = getNetPurchases(olderHalf);
    const newerPurchases = getNetPurchases(newerHalf);
    const purchasesTrend = olderPurchases > 0 ? ((newerPurchases - olderPurchases) / olderPurchases) * 100 : 0;

    const expenseMidpoint = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
    const olderExpenses = (expensesData || []).filter((e: any) => new Date(e.expense_date) < expenseMidpoint).reduce((s: number, e: any) => s + toBaseCurrency(e), 0);
    const newerExpenses = (expensesData || []).filter((e: any) => new Date(e.expense_date) >= expenseMidpoint).reduce((s: number, e: any) => s + toBaseCurrency(e), 0);
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
