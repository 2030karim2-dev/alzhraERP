/**
 * Dashboard Domain Models
 * Strict TypeScript definitions for dashboard data structures
 */

export interface DashboardStats {
    sales: string;
    purchases: string;
    expenses: string;
    debts: string;
    invoices: string;
    profit: string;
    netCash: string;
    salesTrend: number;
    purchasesTrend: number;
    expensesTrend: number;
    profitTrend: number;
}

export interface ChartDataPoint {
    name: string;
    value?: number;
    sales?: number;
    purchases?: number;
    expenses?: number;
    color?: string;
}

export interface TopPerformer {
    id: string;
    name: string;
    value: number;
    [key: string]: any; // Allow additional flex fields depending on entity type
}

export interface CashFlowData {
    inflow: number;
    outflow: number;
    net: number;
}

export interface TargetProgress {
    salesProgress: number;
    collectionRate: number;
}

export interface DashboardAlert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
}

export interface DashboardInsight {
    id: string;
    title: string;
    description: string;
    metric?: string;
    trend?: 'up' | 'down' | 'neutral';
}

export interface RecentActivityItem {
    id: string;
    title: string;
    type: string;
    amount?: number;
    date: string;
    status?: string;
}

export interface LowStockProduct {
    id: string;
    name: string;
    quantity: number;
    min_quantity: number;
}

export interface DashboardDataPayload {
    stats: DashboardStats;
    salesData: ChartDataPoint[];
    categoryData: ChartDataPoint[];
    recentActivities: RecentActivityItem[];
    customers: TopPerformer[];
    topProducts: TopPerformer[];
    topCustomers: TopPerformer[];
    targets: TargetProgress;
    cashFlow: CashFlowData;
    alerts: DashboardAlert[];
    insights: DashboardInsight[];
    lowStockProducts: LowStockProduct[];
}

export interface BaseEntity {
    id: string;
    company_id?: string;
    created_at?: string;
}

// Helper types for raw DB responses
export interface RawInvoice extends BaseEntity {
    total_amount: number;
    issue_date: string;
    status: string;
    type: string;
    party_id: string;
    currency_code?: string;
    exchange_rate?: number;
    party?: { name: string } | null;
}

export interface RawExpense extends BaseEntity {
    amount: number;
    expense_date: string;
    description?: string;
    status: string;
    category_id?: string;
    currency_code?: string;
    exchange_rate?: number;
    expense_categories?: { name: string } | null;
}
