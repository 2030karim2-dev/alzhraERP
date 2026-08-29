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
  allProducts = [],
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
  const [terms, setTerms] = useState<string>('الأسعار شاملة التوصيل والضمان. سداد آجل خلال 30 يوم من تاريخ الفاتورة.');
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
      .filter(p =>
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[var(--app-surface)] h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
        {/* Compact Drawer Header */}
        <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {existingQuotationId ? `تعديل عرض السعر (${quotationNumber})` : 'إنشاء عرض سعر وتوريد جديد'}
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
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="تصدير Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="تصدير PDF"
            >
              <FileText className="w-4 h-4 text-rose-400" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Metadata Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                العملة
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="YER">ريال يمني (YER)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="OMR">ريال عماني (OMR)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                التوريد (أيام)
              </label>
              <input
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={e => setLeadTimeDays(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                الضمان (أيام)
              </label>
              <input
                type="number"
                min="0"
                value={warrantyDays}
                onChange={e => setWarrantyDays(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                الصلاحية حتى
              </label>
              <input
                type="date"
                value={validityDate}
                onChange={e => setValidityDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Quick Product Add Bar */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث لإضافة صنف جديد لعرض السعر بالاسم أو رقم OEM..."
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setIsAddingProduct(true);
                  }}
                  onFocus={() => setIsAddingProduct(true)}
                  className="w-full pr-8 pl-3 py-1.5 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {isAddingProduct && filteredAvailableProducts.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAvailableProducts.map(p => (
                  <button
                    key={p.product_id}
                    type="button"
                    onClick={() => handleAddProductToDraft(p)}
                    className="w-full text-right p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {p.product_name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        OEM: {p.oem_number || p.sku}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400" dir="ltr">
                        {formatCurrency(p.cost_price, currency)}
                      </span>
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                بنود عرض السعر ({items.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[11px]">
                  <tr>
                    <th className="p-2 w-8 text-center">#</th>
                    <th className="p-2 min-w-[180px]">الصنف / OEM</th>
                    <th className="p-2 w-16 text-center">الكمية</th>
                    <th className="p-2 w-24 text-center">سعر الوحدة</th>
                    <th className="p-2 w-16 text-center">الخصم %</th>
                    <th className="p-2 w-24 text-center">الإجمالي</th>
                    <th className="p-2 w-24 text-center">التوفر</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2">
                        <div className="font-bold text-slate-900 dark:text-white leading-tight">
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
                          min="1"
                          value={item.quantity}
                          onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value) || 1)}
                          className="w-full text-center py-1 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded text-xs font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={e => handleUpdateItem(idx, 'unit_price', Number(e.target.value) || 0)}
                          className="w-full text-center py-1 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percentage}
                          onChange={e => handleUpdateItem(idx, 'discount_percentage', Number(e.target.value) || 0)}
                          className="w-full text-center py-1 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-rose-500"
                        />
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-xs text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(item.total_price, currency)}
                      </td>
                      <td className="p-2">
                        <select
                          value={item.availability}
                          onChange={e => handleUpdateItem(idx, 'availability', e.target.value as ItemAvailability)}
                          className="w-full py-1 px-1 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                        >
                          <option value="in_stock">متوفر</option>
                          <option value="on_order">تحت الطلب</option>
                          <option value="unavailable">غير متوفر</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {items.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs">لا توجد بنود مضافة لعرض السعر. استخدم شريط البحث أعلاه لإضافة أصناف.</p>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                الشروط والأحكام
              </label>
              <textarea
                rows={2}
                value={terms}
                onChange={e => setTerms(e.target.value)}
                className="w-full p-2 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                placeholder="شروط التسليم والدفع..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                ملاحظات إضافية
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-2 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                placeholder="أي توضيحات للمشتري..."
              />
            </div>
          </div>
        </div>

        {/* Compact Drawer Footer Summary & Submit */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-400 block">المجموع الفرعي</span>
              <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200" dir="ltr">
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div>
                <span className="text-[10px] text-rose-500 block">الخصم</span>
                <span className="font-mono font-bold text-xs text-rose-500" dir="ltr">
                  -{formatCurrency(totals.discountAmount, currency)}
                </span>
              </div>
            )}
            <div className="pl-3 border-l border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">الإجمالي الصافي</span>
              <span className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400" dir="ltr">
                {formatCurrency(totals.grandTotal, currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={items.length === 0 || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>إرسال واعتماد المراجعة (#{revisionNumber})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
