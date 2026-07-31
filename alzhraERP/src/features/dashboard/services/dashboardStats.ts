import { formatCurrency, toBaseCurrency } from '../../../core/utils/currencyUtils';

export const calculateDashboardStats = (data: {
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
    invoiceItemsData: any[];
}) => {
    const { invoicesData, expensesData, invoiceItemsData } = data;



    const chartDataMap: Record<string, { sales: number; purchases: number; expenses: number }> = {};

    (invoicesData || []).forEach((inv: any) => {
        const type = inv.type?.trim().toLowerCase();
        const date = new Date(inv.issue_date).toLocaleDateString('en-CA');
        if (!chartDataMap[date]) chartDataMap[date] = { sales: 0, purchases: 0, expenses: 0 };

        const amount = toBaseCurrency(inv);

        if (type === 'sale') {
            chartDataMap[date].sales += amount;
        } else if (['return_sale', 'sale_return', 'sales_return'].includes(type)) {
            chartDataMap[date].sales -= amount;
        } else if (type === 'purchase') {
            chartDataMap[date].purchases += amount;
        } else if (['return_purchase', 'purchase_return'].includes(type)) {
            chartDataMap[date].purchases -= amount;
        }
    });

    (expensesData || []).forEach((exp: any) => {
        const date = new Date(exp.expense_date).toLocaleDateString('en-CA');
        if (!chartDataMap[date]) chartDataMap[date] = { sales: 0, purchases: 0, expenses: 0 };
        chartDataMap[date].expenses += toBaseCurrency(exp);
    });

    const salesData = Object.entries(chartDataMap)
        .map(([name, d]) => ({
            name,
            sales: Math.max(0, d.sales),
            purchases: Math.max(0, d.purchases),
            expenses: Math.max(0, d.expenses),
            profit: d.sales - d.purchases - d.expenses,
            value: Math.max(0, d.sales)
        }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    const productSales: Record<string, { name: string; revenue: number; quantity: number }> = {};
    (invoiceItemsData || []).forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.products?.name_ar || 'غير معروف';
        if (!productSales[productId]) {
            productSales[productId] = { name: productName, revenue: 0, quantity: 0 };
        }
        productSales[productId].revenue += Number(item.total) || 0;
        productSales[productId].quantity += Number(item.quantity) || 0;
    });

    const topProducts = Object.entries(productSales)
        .map(([id, pData]) => ({ id, ...pData }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

    const customerPurchases: Record<string, { name: string; total: number; invoices: number }> = {};
    (invoicesData || []).forEach((inv: any) => {
        const type = inv.type?.trim().toLowerCase();
        if (type !== 'sale' && !['return_sale', 'sale_return', 'sales_return'].includes(type)) return;

        const customerId = inv.party_id;
        const customerName = inv.party?.name || 'غير معروف';
        if (!customerPurchases[customerId]) {
            customerPurchases[customerId] = { name: customerName, total: 0, invoices: 0 };
        }

        const amount = toBaseCurrency(inv);
        if (type === 'sale') {
            customerPurchases[customerId].total += amount;
            customerPurchases[customerId].invoices += 1;
        } else {
            customerPurchases[customerId].total -= amount;
            // We don't necessarily decrement invoice count for a return, as it's a separate document
        }
    });

    const topCustomers = Object.entries(customerPurchases)
        .map(([id, cData]) => ({ id, ...cData }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);


    const expenseByCategory: Record<string, number> = {};
    (expensesData || []).forEach((exp: any) => {
        const categoryName = exp.expense_categories?.name || 'غير مصنف';
        expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + toBaseCurrency(exp);
    });

    const categoryData = Object.entries(expenseByCategory)
        .map(([name, value], index) => ({
            name,
            value,
            color: ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'][index % 6]
        }))
        .slice(0, 6);


    const invoiceTypeMap: Record<string, { title: string; color: string }> = {
        sale: { title: 'فاتورة مبيعات', color: 'blue' },
        purchase: { title: 'فاتورة مشتريات', color: 'violet' },
        return_sale: { title: 'مرتجع مبيعات', color: 'orange' },
        return_purchase: { title: 'مرتجع مشتريات', color: 'amber' },
    };

    const recentActivities = [
        ...(invoicesData || []).slice(-5).map((i: any) => ({
            id: i.id || `inv-${Math.random()}`,
            type: i.type,
            title: invoiceTypeMap[i.type]?.title || 'فاتورة',
            desc: formatCurrency(i.total_amount),
            time: i.issue_date,
            color: invoiceTypeMap[i.type]?.color || 'gray'
        })),
        ...(expensesData || []).slice(-3).map((e: any) => ({
            id: e.id || `exp-${Math.random()}`,
            type: 'expense',
            title: `مصروف: ${e.description}`,
            desc: formatCurrency(e.amount),
            time: e.expense_date,
            color: 'rose'
        }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

    return {
        salesData,
        productSales,
        topProducts,
        topCustomers,
        categoryData,
        recentActivities
    };
};
