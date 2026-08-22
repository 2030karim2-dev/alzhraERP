import { formatCurrency } from '../../../core/utils/currencyUtils';

/**
 * صف ميزان المراجعة كما يُستقبل من RPC `report_trial_balance` (أو طبقة API).
 * يقبل كلاً من تسمية camelCase و snake_case لمرونة العقود.
 */
export interface TrialBalanceRowLike {
    code?: string;
    account_code?: string;
    netBalance?: number;
    balance?: number;
}

/**
 * صف قائمة الدخل كما تُستقبل من RPC `report_profit_loss`.
 * الصفوف: [{ category, amount, type }] حيث type ∈ ('revenue' | 'expense' | 'net_profit').
 */
export interface ProfitLossRowLike {
    type?: string;
    amount?: number | string;
}

/**
 * تجميع أرصدة ميزان المراجعة حسب بادئة كود الحساب (مثال: '4' للإيرادات، '5' للمصروفات).
 * هذه مساعدة احتياطية فقط — المصدر المعتمد لصافي الربح هو `report_profit_loss`.
 */
export const sumTrialBalanceByPrefix = (rows: TrialBalanceRowLike[], prefix: string): number => {
    return rows.reduce((sum, row) => {
        const code = row.code ?? row.account_code ?? '';
        if (String(code).startsWith(prefix)) {
            const value = Number(row.netBalance ?? row.balance);
            return sum + (Number.isFinite(value) ? value : 0);
        }
        return sum;
    }, 0);
};

/**
 * حساب صافي الربح المعتمد:
 * 1) المصدر الأساسي: صف `net_profit` من RPC `report_profit_loss` (إشارات محاسبية موثوقة).
 * 2) الاحتياط فقط عند غياب/فشل الـ RPC: ميزان المراجعة بأكواد 4 (إيرادات) / 5 (مصروفات).
 */
export const resolveNetProfit = (
    profitLossRows: ProfitLossRowLike[],
    trialBalanceRows: TrialBalanceRowLike[]
): number => {
    const netRow = profitLossRows.find((r) => r.type === 'net_profit');
    const serverNetProfit = netRow ? Number(netRow.amount) : Number.NaN;

    const legacyNetProfit =
        sumTrialBalanceByPrefix(trialBalanceRows, '4') -
        sumTrialBalanceByPrefix(trialBalanceRows, '5');

    return Number.isFinite(serverNetProfit) ? serverNetProfit : legacyNetProfit;
};

/**
 * حساب معدل نمو المبيعات اليومية الظاهر في بطاقة "تحليل تدفق المبيعات".
 * - مع 6 نقاط أو أكثر: متوسط آخر 3 أيام مقابل متوسط الأيام الثلاثة السابقة
 *   (نفس منطق الاتجاه داخل شارت تدفق المبيعات) — يُظهر رقماً ذا معنى.
 * - مع نقطتين إلى 5: آخر نقطة مقابل المتوسط العام.
 * - يُرجع 0 عندما لا توجد بيانات أو لا توجد مبيعات سابقة للمقارنة
 *   (تجنّباً لشارة "0.0%" الدائمة على بطاقة اللوحة).
 */
export const computeSalesGrowthRate = (salesValues: number[] | null | undefined): number => {
    const values = (salesValues ?? []).filter((v) => Number.isFinite(v));
    if (values.length === 0) return 0;

    if (values.length >= 6) {
        const last3 = values.slice(-3).reduce((sum, v) => sum + v, 0) / 3;
        const prev3 = values.slice(-6, -3).reduce((sum, v) => sum + v, 0) / 3;
        return prev3 > 0 ? ((last3 - prev3) / prev3) * 100 : 0;
    }

    if (values.length < 2) return 0;
    const current = values[values.length - 1];
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return avg > 0 ? ((current - avg) / avg) * 100 : 0;
};

export const calculateDashboardInsights = (data: {
    receiptBonds: number;
    paymentBonds: number;
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    netProfit: number;
    /**
     * ذمم العملاء (المستحقات الواجب تحصيلها) — المصدر الصحيح لمعدل التحصيل.
     * قبل هذا الإصلاح كان يُستخدم `totalSupplierDebts` في الطرح من المبيعات،
     * ما جعل نسبة التحصيل تتأثر بديون الموردين (بند متعاكس تماماً).
     */
    totalCustomerDebts?: number;
    /**
     * ذمم الموردين (ما يترتب علينا للموردين) — تُعرض كتنبيه مستقل فقط
     * ولا تدخل في حساب معدل التحصيل أبداً.
     */
    totalSupplierDebts?: number;
    salesChartData?: Array<{ sales?: number; purchases?: number; expenses?: number; value?: number }>;
    lowStockProducts: Array<{ id: string; name?: string }>;
    overdueInvoices: Array<{ id: string }>;
    /**
     * Explicit sales target for the period. When omitted, a dynamic target is
     * derived from the actual sales (current × 1.2) instead of a hardcoded 100k.
     */
    salesTarget?: number;
}) => {
    const {
        totalSales = 0,
        salesChartData = [],
        lowStockProducts = [],
        overdueInvoices = [],
        totalCustomerDebts = 0,
        totalSupplierDebts = 0,
        salesTarget,
    } = data;

    // ذمم العملاء = المستحقات الواجب تحصيلها (مصدر معدل التحصيل الصحيح).
    // ذمم الموردين تُعرض كتنبيه مستقل ولا تدخل في حساب التحصيل أبداً.
    const totalReceivables = totalCustomerDebts;

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
            message: `${overdueInvoices.length} حسابات متأخرة التحصيل`,
            time: 'تحتاج متابعة'
        });
    }

    if (totalReceivables > 0) {
        alerts.push({
            id: 'debts',
            type: 'info' as const,
            message: `إجمالي المستحقات: ${formatCurrency(totalReceivables)}`,
            time: 'قيد التحصيل'
        });
    }

    if (totalSupplierDebts > 0) {
        alerts.push({
            id: 'supplier-debts',
            type: 'info' as const,
            message: `مستحقات الموردين: ${formatCurrency(totalSupplierDebts)}`,
            time: 'تتطلب سداداً'
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

    // معدل التحصيل المحاسبي: نسبة المقبوضات المحصلة إلى إجمالي المبيعات، محصورة منطقياً بين 0% و 100%
    const collectedSales = Math.max(0, totalSales - Math.min(totalSales, totalReceivables));
    const collectionRate = totalSales > 0 ? Math.min(100, Math.max(0, (collectedSales / totalSales) * 100)) : 100;
    if (collectionRate < 80 && totalSales > 0) {
        insights.push({
            id: 'collection',
            type: 'info' as const,
            message: `${overdueInvoices.length} حسابات متأخرة التحصيل`,
            detail: `المجموع: ${formatCurrency(totalReceivables)}`
        });
    }

    // Dynamic sales target: explicit value when provided, otherwise a 20%
    // growth target over the current period's actual sales (no more 100k magic).
    const effectiveSalesTarget = salesTarget !== undefined && salesTarget > 0
        ? salesTarget
        : Math.max(1, totalSales * 1.2);
    const salesProgress = totalSales > 0 ? Math.min(100, (totalSales / effectiveSalesTarget) * 100) : 0;
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
        salesTarget: Math.round(effectiveSalesTarget),
        olderSales,
        olderPurchases,
        olderExpenses,
        newerSales,
        newerPurchases,
        newerExpenses
    };
};
