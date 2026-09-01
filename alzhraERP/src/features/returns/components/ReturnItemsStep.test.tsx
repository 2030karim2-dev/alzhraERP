import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import React from 'react';
import { ReturnItemsStep } from './ReturnItemsStep';
import InvoiceSelector from './InvoiceSelector';
import type { Invoice } from '../types';

const invoices: Invoice[] = [
  {
    id: 'inv-1',
    invoice_number: 'INV-001',
    type: 'sale',
    issue_date: '2026-08-01',
    total_amount: 2000,
    currency_code: 'SAR',
    payment_method: 'cash',
    invoice_items: [
      {
        id: 'line-1',
        product_id: 'product-1',
        description: 'منتج أول',
        quantity: 10,
        unit_price: 100,
        total: 1000,
        cost_price: 60,
      },
      {
        id: 'line-2',
        product_id: 'product-2',
        description: 'منتج ثان',
        quantity: 5,
        unit_price: 200,
        total: 1000,
        cost_price: 120,
      },
    ],
  },
];

const renderStep = (initialValues: Record<string, unknown> = {}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const methods = useForm({
      defaultValues: {
        invoiceId: '',
        items: [],
        returnReason: '',
        status: 'processing',
        date: '2026-08-10',
        notes: '',
        ...initialValues,
      },
    });
    return <FormProvider {...methods}>{children}</FormProvider>;
  };
  return render(<ReturnItemsStep invoices={invoices} isLoadingInvoices={false} />, {
    wrapper: Wrapper,
  });
};

const selectInvoice = () => {
  fireEvent.click(screen.getByText('اضغط لاختيار الفاتورة...'));
  fireEvent.click(screen.getByText('INV-001'));
};

describe('ReturnItemsStep', () => {
  it('زر "إرجاع كامل المنتجات بالفاتورة" يحدد كل الأصناف بالكميات الكاملة وتظهر في الحقول', () => {
    renderStep();
    selectInvoice();

    // قبل الضغط لا توجد كميات
    const quantityInputs = () => document.querySelectorAll('input[type="number"]');
    expect(quantityInputs()).toHaveLength(2);

    fireEvent.click(screen.getAllByText(/إرجاع كامل/)[0]);

    // الكميات الكاملة (10 و 5) تظهر في حقول الإرجاع
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('كتابة كمية لصنف غير محدد تضيفه بالكمية المدخلة وليس 1', () => {
    renderStep();
    selectInvoice();

    const quantityInputs = () => document.querySelectorAll('input[type="number"]');
    const inputs = quantityInputs();
    expect(inputs).toHaveLength(2);

    // كتابة كمية 7 في أول صنف دون تحديد checkbox
    fireEvent.change(inputs[0], { target: { value: '7' } });

    // ملخص الأصناف المحددة يظهر الصنف بكمية 7 (لا 1)
    expect(screen.getAllByText('منتج أول').length).toBeGreaterThan(0);
    expect(screen.getByText('7x')).toBeInTheDocument();
    // الكمية تبقى 7 في الحقل (المفتاح الموحد)
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();
  });

  it('تحديد checkbox ثم تغيير الكمية يعمل دون تكرار الصنف', () => {
    renderStep();
    selectInvoice();

    // تحديد أول صنف عبر checkbox
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[0]);

    // ملخص يعرض الصنف مرة واحدة بكمية 1
    const summaryItems = screen.getAllByText('منتج أول');
    expect(summaryItems.length).toBe(2); // مرة في الجدول ومرة في الملخص

    // تغيير الكمية إلى 4
    const inputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[0], { target: { value: '4' } });

    // لا تكرار: الصنف يظهر مرة واحدة فقط في الملخص
    expect(screen.getAllByText('منتج أول')).toHaveLength(2);
    expect(screen.getByText('4x')).toBeInTheDocument();
  });
});

describe('InvoiceSelector', () => {
  it('البحث عن فاتورة لا ينهار (إصلاح خطأ TDZ لـ formatDate)', () => {
    render(<InvoiceSelector invoices={invoices} selectedInvoiceId="" onSelectInvoice={() => {}} />);

    // فتح القائمة ثم البحث
    fireEvent.click(screen.getByText('اختر الفاتورة الأصلية...'));
    const searchInput = screen.getByRole('textbox');
    expect(() => fireEvent.change(searchInput, { target: { value: 'INV' } })).not.toThrow();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });
});
