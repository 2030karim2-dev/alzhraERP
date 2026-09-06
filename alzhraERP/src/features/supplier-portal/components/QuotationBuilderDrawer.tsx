import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Trash2,
  FileSpreadsheet,
  FileText,
  Calculator,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import { calculateQuotationItem, calculateQuotationTotals } from '../services/quotationCalculator';
import { exportQuotationToExcel } from '../services/excelEngine';
import { generateQuotationPDF } from '../services/pdfEngine';
import type { QuotationItemDraft, VendorProductItem, ItemAvailability } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: QuotationItemDraft[];
  allProducts: VendorProductItem[];
  companyName: string;
  supplierName: string;
  quotationNumber?: string;
  existingQuotationId?: string;
  revisionNumber?: number;
  currency?: string;
  onSubmitQuotation: (payload: {
    items: QuotationItemDraft[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    currency: string;
    leadTimeDays: number;
    warrantyDays: number;
    validityDate: string | null;
    terms: string | null;
    notes: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const QuotationBuilderDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  initialItems = [],
  allProducts,
  companyName,
  supplierName,
  quotationNumber = 'VQ-NEW',
  existingQuotationId,
  revisionNumber = 1,
  currency: initialCurrency = 'SAR',
  onSubmitQuotation,
  isSubmitting = false,
}) => {
  const [items, setItems] = useState<QuotationItemDraft[]>(initialItems);
  const [currency, setCurrency] = useState<string>(initialCurrency);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(3);
  const [warrantyDays, setWarrantyDays] = useState<number>(30);
  const [validityDate, setValidityDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [terms, setTerms] = useState<string>(
    'الأسعار شاملة التوصيل والضمان. سداد آجل خلال 30 يوم من تاريخ الفاتورة.'
  );
  const [notes, setNotes] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Synchronize initialItems when opened
  React.useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems.map(item => calculateQuotationItem(item)));
    } else {
      setItems([]);
    }
  }, [initialItems]);

  // Recalculate totals
  const totals = useMemo(() => {
    return calculateQuotationTotals(items);
  }, [items]);

  // Handlers for modifying lines (Type-Safe)
  const handleUpdateItem = <K extends keyof QuotationItemDraft>(
    index: number,
    field: K,
    value: QuotationItemDraft[K]
  ) => {
    setItems(prev => {
      const copy = [...prev];
      const current = copy[index];
      if (!current) return prev;
      const updated: QuotationItemDraft = { ...current, [field]: value };
      copy[index] = calculateQuotationItem(updated);
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProductToDraft = (product: VendorProductItem) => {
    const newItem: QuotationItemDraft = calculateQuotationItem({
      product_id: product.product_id,
      product_name: product.product_name,
      oem_number: product.oem_number,
      vendor_sku: product.vendor_sku,
      quantity: 1,
      unit_of_measure: product.unit || 'حبة',
      unit_price: product.cost_price,
      discount_percentage: 0,
      discount_amount: 0,
      tax_percentage: 0,
      tax_amount: 0,
      availability: 'in_stock',
      lead_time_days: product.lead_time_days || 3,
      warranty_days: 30,
      vendor_notes: '',
    });

    setItems(prev => [...prev, newItem]);
    setProductSearch('');
    setIsAddingProduct(false);
  };

  // Filtered available products to add
  const filteredAvailableProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const lower = productSearch.toLowerCase();
    return allProducts
      .filter(
        p =>
          p.product_name.toLowerCase().includes(lower) ||
          p.sku.toLowerCase().includes(lower) ||
          (p.oem_number && p.oem_number.toLowerCase().includes(lower))
      )
      .slice(0, 8);
  }, [allProducts, productSearch]);

  const handleExportExcel = async () => {
    await exportQuotationToExcel({
      companyName,
      supplierName,
      quotationNumber,
      currency,
      items,
      subtotal: totals.subtotal,
      taxAmount: 0,
      totalAmount: totals.grandTotal,
      notes,
      deliveryDays: leadTimeDays,
    });
  };

  const handleExportPDF = async () => {
    await generateQuotationPDF({
      companyName,
      supplierName,
      quotationNumber,
      revisionNumber,
      issueDate: new Date().toLocaleDateString('en-CA'),
      validUntil: validityDate,
      currency,
      items,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: 0,
      totalAmount: totals.grandTotal,
      deliveryDays: leadTimeDays,
      warrantyDays,
      terms,
      notes,
    });
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    await onSubmitQuotation({
      items,
      subtotal: totals.subtotal,
      discount: totals.discountAmount,
      tax: 0,
      total: totals.grandTotal,
      currency,
      leadTimeDays,
      warrantyDays,
      validityDate,
      terms,
      notes,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex justify-end overflow-hidden bg-slate-900/60 duration-150">
      <div className="animate-in slide-in-from-left flex h-full w-full max-w-4xl flex-col border-r border-slate-200 bg-[var(--app-surface)] shadow-2xl duration-200 dark:border-slate-800">
        {/* Compact Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-indigo-400">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {existingQuotationId
                  ? `تعديل عرض السعر (${quotationNumber})`
                  : 'إنشاء عرض سعر وتوريد جديد'}
              </h2>
              <p className="text-[11px] text-slate-400">
                المورد: {supplierName} | المراجعة: #{revisionNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportExcel}
              className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              title="تصدير Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              title="تصدير PDF"
            >
              <FileText className="h-4 w-4 text-rose-400" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Metadata Controls */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                العملة
              </label>
              <select
                value={currency}
                onChange={e => {
                  setCurrency(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] px-2.5 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 dark:border-slate-700"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="YER">ريال يمني (YER)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="OMR">ريال عماني (OMR)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                التوريد (أيام)
              </label>
              <input
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={e => {
                  setLeadTimeDays(Number(e.target.value) || 0);
                }}
                className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] px-2.5 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                الضمان (أيام)
              </label>
              <input
                type="number"
                min="0"
                value={warrantyDays}
                onChange={e => {
                  setWarrantyDays(Number(e.target.value) || 0);
                }}
                className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] px-2.5 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                الصلاحية حتى
              </label>
              <input
                type="date"
                value={validityDate}
                onChange={e => {
                  setValidityDate(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] px-2.5 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Quick Product Add Bar */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث لإضافة صنف جديد لعرض السعر بالاسم أو رقم OEM..."
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setIsAddingProduct(true);
                  }}
                  onFocus={() => {
                    setIsAddingProduct(true);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] py-1.5 pl-3 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700"
                />
              </div>
            </div>

            {isAddingProduct && filteredAvailableProducts.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-[var(--app-surface)] shadow-lg dark:divide-slate-800 dark:border-slate-700">
                {filteredAvailableProducts.map(p => (
                  <button
                    key={p.product_id}
                    type="button"
                    onClick={() => {
                      handleAddProductToDraft(p);
                    }}
                    className="flex w-full items-center justify-between p-2.5 text-right text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div>
                      <span className="block font-bold text-slate-900 dark:text-white">
                        {p.product_name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        OEM: {p.oem_number || p.sku}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400"
                        dir="ltr"
                      >
                        {formatCurrency(p.cost_price, currency)}
                      </span>
                      <Plus className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                بنود عرض السعر ({items.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/50 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/30">
                  <tr>
                    <th className="w-8 p-2 text-center">#</th>
                    <th className="min-w-[180px] p-2">الصنف / OEM</th>
                    <th className="w-16 p-2 text-center">الكمية</th>
                    <th className="w-24 p-2 text-center">سعر الوحدة</th>
                    <th className="w-16 p-2 text-center">الخصم %</th>
                    <th className="w-24 p-2 text-center">الإجمالي</th>
                    <th className="w-24 p-2 text-center">التوفر</th>
                    <th className="w-8 p-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="p-2 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-2">
                        <div className="font-bold leading-tight text-slate-900 dark:text-white">
                          {item.product_name}
                        </div>
                        {item.oem_number && (
                          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                            OEM: {item.oem_number}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={item.quantity}
                          onChange={e => {
                            handleUpdateItem(idx, 'quantity', Number(e.target.value) || 1);
                          }}
                          className="w-full rounded border border-slate-200 bg-[var(--app-surface)] py-1 text-center text-xs font-bold dark:border-slate-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unit_price}
                          onChange={e => {
                            handleUpdateItem(idx, 'unit_price', Number(e.target.value) || 0);
                          }}
                          className="w-full rounded border border-slate-200 bg-[var(--app-surface)] py-1 text-center font-mono text-xs font-bold dark:border-slate-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={item.discount_percentage}
                          onChange={e => {
                            handleUpdateItem(
                              idx,
                              'discount_percentage',
                              Number(e.target.value) || 0
                            );
                          }}
                          className="w-full rounded border border-slate-200 bg-[var(--app-surface)] py-1 text-center text-xs font-bold text-rose-500 dark:border-slate-700"
                        />
                      </td>
                      <td
                        className="p-2 text-center font-mono text-xs font-bold text-slate-900 dark:text-white"
                        dir="ltr"
                      >
                        {formatCurrency(item.total_price, currency)}
                      </td>
                      <td className="p-2">
                        <select
                          value={item.availability}
                          onChange={e => {
                            handleUpdateItem(
                              idx,
                              'availability',
                              e.target.value as ItemAvailability
                            );
                          }}
                          className="w-full rounded border border-slate-200 bg-[var(--app-surface)] px-1 py-1 text-[11px] dark:border-slate-700"
                        >
                          <option value="in_stock">متوفر</option>
                          <option value="on_order">تحت الطلب</option>
                          <option value="unavailable">غير متوفر</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            handleRemoveItem(idx);
                          }}
                          className="p-1 text-slate-400 transition-colors hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {items.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs">
                    لا توجد بنود مضافة لعرض السعر. استخدم شريط البحث أعلاه لإضافة أصناف.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                الشروط والأحكام
              </label>
              <textarea
                rows={2}
                value={terms}
                onChange={e => {
                  setTerms(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] p-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700"
                placeholder="شروط التسليم والدفع..."
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                ملاحظات إضافية
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => {
                  setNotes(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] p-2 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700"
                placeholder="أي توضيحات للمشتري..."
              />
            </div>
          </div>
        </div>

        {/* Compact Drawer Footer Summary & Submit */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div>
              <span className="block text-[10px] text-slate-400">المجموع الفرعي</span>
              <span
                className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                dir="ltr"
              >
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div>
                <span className="block text-[10px] text-rose-500">الخصم</span>
                <span className="font-mono text-xs font-bold text-rose-500" dir="ltr">
                  -{formatCurrency(totals.discountAmount, currency)}
                </span>
              </div>
            )}
            <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
              <span className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                الإجمالي الصافي
              </span>
              <span
                className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400"
                dir="ltr"
              >
                {formatCurrency(totals.grandTotal, currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={items.length === 0 || isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>إرسال واعتماد المراجعة (#{revisionNumber})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
