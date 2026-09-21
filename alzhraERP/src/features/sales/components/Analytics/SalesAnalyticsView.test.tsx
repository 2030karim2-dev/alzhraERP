import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import SalesAnalyticsView from './SalesAnalyticsView';

// Mock auth store
vi.mock('@/features/auth/store', () => ({
  useAuthStore: () => ({
    user: { company_id: 'test-company-uuid', full_name: 'Test Admin' },
  }),
}));

// Mock translation
vi.mock('@/lib/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/i18nStore', () => ({
  useI18nStore: () => ({
    dictionary: {
      sales_analytics: 'تحليلات المبيعات',
      track_sales_performance: 'متابعة أداء المبيعات',
      total_sales_amount: 'إجمالي المبيعات',
      net_sales: 'صافي المبيعات',
      invoices_count: 'عدد الفواتير',
      average_invoice: 'متوسط الفاتورة',
      returns: 'المردودات',
      top_customer: 'أكبر عميل',
      top_product: 'أعلى منتج',
      cash_ratio: 'نسبة النقد',
      sales_trend: 'مسار المبيعات',
      payment_methods: 'طرق الدفع',
      top_products: 'أفضل المنتجات',
      top_customers: 'كبار العملاء',
      sales: 'المبيعات',
      cash: 'نقداً',
      credit: 'آجل',
      card: 'بطاقة',
      bank_transfer: 'تحويل بنكي',
    },
  }),
}));

// Mock useSalesAnalytics hook
vi.mock('../../hooks/useSalesAnalytics', () => ({
  useSalesAnalytics: () => ({
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    totalSales: 150000,
    totalReturns: 5000,
    netSales: 145000,
    invoiceCount: 120,
    averageInvoiceValue: 1250,
    prevTotalSales: 120000,
    prevTotalReturns: 4000,
    topProducts: [
      { productId: 'p1', productName: 'زيت محرك سوبر 5W-30', quantity: 85, revenue: 32000 },
      { productId: 'p2', productName: 'فلتر هواء أصلي', quantity: 60, revenue: 15000 },
    ],
    topCustomers: [
      { customerId: 'c1', customerName: 'شركة النقل السريع', totalAmount: 48000, invoiceCount: 18 },
      {
        customerId: 'c2',
        customerName: 'مؤسسة الوفاء التجارية',
        totalAmount: 26000,
        invoiceCount: 11,
      },
    ],
    salesByDay: [
      { date: '2026-09-01', sales: 12000, returns: 0 },
      { date: '2026-09-02', sales: 18000, returns: 500 },
    ],
    salesByPaymentMethod: [
      { method: 'cash', amount: 90000 },
      { method: 'card', amount: 45000 },
      { method: 'credit', amount: 15000 },
    ],
  }),
}));

describe('SalesAnalyticsView Component', () => {
  it('renders executive AI radar, KPIs, charts, and top rankings without errors', () => {
    render(<SalesAnalyticsView />);

    // AI Radar check
    expect(screen.getByText('رادار الذكاء الاصطناعي لتحليل المبيعات')).toBeInTheDocument();
    expect(screen.getByText('AI Executive Insights')).toBeInTheDocument();

    // Top products & top customers check (can appear in spotlight KPI and list)
    const productElements = screen.getAllByText('زيت محرك سوبر 5W-30');
    expect(productElements.length).toBeGreaterThanOrEqual(1);

    const customerElements = screen.getAllByText('شركة النقل السريع');
    expect(customerElements.length).toBeGreaterThanOrEqual(1);
  });
});
