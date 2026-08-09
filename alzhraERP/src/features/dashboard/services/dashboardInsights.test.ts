import { describe, it, expect } from 'vitest';
import { calculateDashboardInsights } from './dashboardInsights';

// ── Trend Calculations ─────────────────────────────────

describe('calculateDashboardInsights', () => {
  it('returns zero trends for empty data', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0,
      paymentBonds: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSupplierDebts: 0,
      salesChartData: [],
      lowStockProducts: [],
      overdueInvoices: [],
    });

    expect(result.salesTrend).toBe(0);
    expect(result.purchasesTrend).toBe(0);
    expect(result.expensesTrend).toBe(0);
  });

  it('calculates positive sales trend', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0,
      paymentBonds: 0,
      totalSales: 1000,
      totalPurchases: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSupplierDebts: 0,
      salesChartData: [
        { sales: 100 }, { sales: 100 },  // older half
        { sales: 150 }, { sales: 150 },  // newer half
      ],
      lowStockProducts: [],
      overdueInvoices: [],
    });

    expect(result.salesTrend).toBeCloseTo(50, 1); // 50% increase
  });

  it('calculates negative sales trend', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0,
      paymentBonds: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSupplierDebts: 0,
      salesChartData: [
        { sales: 200 }, { sales: 200 },
        { sales: 100 }, { sales: 100 },
      ],
      lowStockProducts: [],
      overdueInvoices: [],
    });

    expect(result.salesTrend).toBeLessThan(0);
  });

  it('uses "value" key when "sales" key is missing', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0,
      paymentBonds: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSupplierDebts: 0,
      salesChartData: [
        { value: 100 }, { value: 100 },
        { value: 200 }, { value: 200 },
      ],
      lowStockProducts: [],
      overdueInvoices: [],
    });

    expect(result.salesTrend).toBeCloseTo(100, 0);
  });
});

// ── Alerts ─────────────────────────────────────────────

describe('Alerts', () => {
  it('generates low-stock alert', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], overdueInvoices: [],
      lowStockProducts: [{ id: '1', name: 'X' }],
    });
    expect(result.alerts.some(a => a.id === 'low-stock')).toBe(true);
  });

  it('generates overdue invoice alert', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [{ id: 'inv1' }],
    });
    expect(result.alerts.some(a => a.id === 'overdue-invoices')).toBe(true);
  });

  it('returns empty alerts when no issues', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [],
    });
    expect(result.alerts).toHaveLength(0);
  });
});

// ── Targets ────────────────────────────────────────────

describe('Targets', () => {
  it('calculates sales progress against 100k target', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 50000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [],
    });
    expect(result.targets.salesProgress).toBe(50);
  });

  it('caps sales progress at 100%', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 200000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [],
    });
    expect(result.targets.salesProgress).toBe(100);
  });
});

