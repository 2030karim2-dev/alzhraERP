import { describe, it, expect } from 'vitest';
import { calculateDashboardInsights, resolveNetProfit, sumTrialBalanceByPrefix } from './dashboardInsights';

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
  it('calculates sales progress against an explicit target', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 50000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [], salesTarget: 100000,
    });
    expect(result.targets.salesProgress).toBe(50);
  });

  it('caps sales progress at 100%', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 200000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [], salesTarget: 100000,
    });
    expect(result.targets.salesProgress).toBe(100);
  });

  it('derives a dynamic target (sales × 1.2) when no explicit target is given', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 50000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [],
    });
    // target = 60000 → progress = 50000/60000*100 ≈ 83
    expect(result.targets.salesProgress).toBe(83);
    expect(result.salesTarget).toBe(60000);
  });

  it('returns zero progress when there are no sales', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], lowStockProducts: [],
      overdueInvoices: [],
    });
    expect(result.targets.salesProgress).toBe(0);
  });
});

// ── Collection Rate (regression: previously used supplier debts) ─────────────
//
// قبل الإصلاح كان `collectionRate` يطرح `totalSupplierDebts` من المبيعات، ما يجعل
// نسبة التحصيل تتأثر بديون الموردين (بند متعاكس). بعد الإصلاح يُستخدم
// `totalCustomerDebts` (ذمم العملاء) فقط كمصدر للمعدل.

describe('Collection rate uses customer receivables (not supplier debts)', () => {
  it('uses totalCustomerDebts to compute the collection rate', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 1000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalCustomerDebts: 400,      // ذمم العملاء (غير محصلة)
      totalSupplierDebts: 900,      // ذمم الموردين — يجب ألا تؤثر إطلاقاً
      salesChartData: [], lowStockProducts: [], overdueInvoices: [],
    });
    // collectionRate = (1000 - 400) / 1000 = 60% (وليس 10% لو استُخدمت ديون الموردين)
    expect(result.targets.collectionRate).toBe(60);
  });

  it('emits a separate supplier-debts alert without mixing it into receivables', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 1000,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalCustomerDebts: 0,
      totalSupplierDebts: 500,
      salesChartData: [], lowStockProducts: [], overdueInvoices: [],
    });
    expect(result.alerts.some(a => a.id === 'supplier-debts')).toBe(true);
    // المعدل يبقى 100% رغم وجود ديون الموردين
    expect(result.targets.collectionRate).toBe(100);
  });

  it('falls back to 100% collection when no customer debts exist', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 500,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalCustomerDebts: 0, totalSupplierDebts: 0,
      salesChartData: [], lowStockProducts: [], overdueInvoices: [],
    });
    expect(result.targets.collectionRate).toBe(100);
  });
});
// ── Net Profit resolution (server RPC primary, trial-balance fallback) ────────
// المشكلة رقم 3: كان صافي الربح يُحسب محلياً بأكواد حسابات (4/5) مع إشارات مشكوك بها.
// بعد الإصلاح: `report_profit_loss` هو المصدر المعتمد، والميزان احتياط فقط.

describe('resolveNetProfit', () => {
  it('prefers the server net_profit row from report_profit_loss', () => {
    const result = resolveNetProfit(
      [
        { type: 'revenue', amount: 2000 },
        { type: 'expense', amount: 700 },
        { type: 'net_profit', amount: 1300 },
      ],
      // سينتج الاحتياط 800 هنا لو استُخدم — يجب ألا يُستخدم أبداً عندما يكون RPC متاحاً
      [
        { code: '4001', netBalance: 1000 },
        { code: '5001', netBalance: 200 },
      ]
    );
    expect(result).toBe(1300);
  });

  it('falls back to trial-balance code math when the P&L RPC row is missing', () => {
    const result = resolveNetProfit(
      // لا يوجد صف net_profit (فشل/غياب الـ RPC → fallback)
      [
        { type: 'revenue', amount: 2000 },
        { type: 'expense', amount: 700 },
      ],
      [
        { code: '4001', netBalance: 5000 },
        { code: '5001', netBalance: 2000 },
      ]
    );
    // legacy = 5000 - 2000 = 3000
    expect(result).toBe(3000);
  });

  it('returns zero when there is no P&L data and no trial-balance rows', () => {
    expect(resolveNetProfit([], [])).toBe(0);
  });

  it('handles NaN amounts from the server defensively', () => {
    const result = resolveNetProfit(
      [{ type: 'net_profit', amount: Number.NaN }],
      [{ code: '4001', netBalance: 100 }, { code: '5001', netBalance: 40 }]
    );
    // NaN من الخادم → fallback: 100 - 40 = 60
    expect(result).toBe(60);
  });
});

// ── Trial-balance prefix aggregation (used as the net-profit fallback) ─────────

describe('sumTrialBalanceByPrefix', () => {
  it('aggregates rows whose code starts with the prefix (camelCase netBalance)', () => {
    const rows = [
      { code: '4001', netBalance: 1500 },
      { code: '4010', netBalance: 500 },
      { code: '5001', netBalance: 300 }, // يُستبعد (لا يبدأ بـ 4)
    ];
    expect(sumTrialBalanceByPrefix(rows, '4')).toBe(2000);
  });

  it('supports snake_case fields (account_code / balance) from the raw RPC', () => {
    const rows = [
      { account_code: '5001', balance: 800 },
      { account_code: '5002', balance: 200 },
    ];
    expect(sumTrialBalanceByPrefix(rows, '5')).toBe(1000);
  });

  it('ignores non-finite balance values instead of corrupting the sum', () => {
    const rows = [
      { code: '4001', netBalance: Number.NaN },
      { code: '4002', netBalance: 250 },
    ];
    expect(sumTrialBalanceByPrefix(rows, '4')).toBe(250);
  });
});



// ── Resilience against stale/partial persisted payloads ──────────────────────
//
// Regression: the dashboard API started returning `overdueInvoices` later than
// the (24h) persisted IndexedDB cache was written, so a stale cache could still
// hold a payload WITHOUT that field. `calculateDashboardInsights` is invoked
// from inside the `processedData` useMemo, so a missing field used to throw
// `Cannot read properties of undefined (reading 'length')` and take down the
// whole dashboard. It must degrade to empty arrays / zeros instead.

describe('Resilience to partial data', () => {
  it('does not crash when overdueInvoices is undefined', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [],
      // overdueInvoices deliberately omitted (stale cache shape)
    } as Parameters<typeof calculateDashboardInsights>[0]);

    expect(result.alerts.some(a => a.id === 'overdue-invoices')).toBe(false);
    expect(Number.isNaN(result.targets.salesProgress)).toBe(false);
  });

  it('does not crash when lowStockProducts is undefined', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, salesChartData: [], overdueInvoices: [],
      // lowStockProducts deliberately omitted
    } as Parameters<typeof calculateDashboardInsights>[0]);

    expect(result.alerts.some(a => a.id === 'low-stock')).toBe(false);
  });

  it('does not crash when salesChartData is undefined', () => {
    const result = calculateDashboardInsights({
      receiptBonds: 0, paymentBonds: 0, totalSales: 0,
      totalPurchases: 0, totalExpenses: 0, netProfit: 0,
      totalSupplierDebts: 0, lowStockProducts: [], overdueInvoices: [],
      // salesChartData deliberately omitted (it is optional in the signature)
    });

    expect(result.salesTrend).toBe(0);
  });

  it('does not crash when all dashboard fields are missing', () => {
    const result = calculateDashboardInsights({} as Parameters<typeof calculateDashboardInsights>[0]);

    expect(result.targets.salesProgress).toBe(0);
    expect(Number.isNaN(result.salesTrend)).toBe(false);
  });
});

