import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Trash2,
  FileSpreadsheet,
  FileText,
  Calculator,
  Loader2,
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

  // Synchronize initialItems when opened
  React.useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems.map(item => calculateQuotationItem(item)));
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

  const handleExportExcel = async () => {
    await exportQuotationToExcel({
      companyName,
      supplierName,
      quotationNumber,
      currency,
      items,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
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
      taxAmount: totals.taxAmount,
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
      tax: totals.taxAmount,
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {existingQuotationId ? `تعديل عرض السعر (${quotationNumber})` : 'إنشاء عرض سعر وتوريد جديد'}
              </h2>
              <p className="text-xs text-slate-400">
                المورد: {supplierName} | المراجعة الحالية: #{revisionNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="تصدير Excel"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </button>
            <button
              onClick={handleExportPDF}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="تصدير PDF"
            >
              <FileText className="w-5 h-5 text-rose-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                العملة
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="YER">ريال يمني (YER)</option>
                <option value="OMR">ريال عماني (OMR)</option>
                <option value="IQD">دينار عراقي (IQD)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                مدة التوريد (أيام)
              </label>
              <input
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={e => setLeadTimeDays(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                فترة الضمان (أيام)
              </label>
              <input
                type="number"
                min="0"
                value={warrantyDays}
                onChange={e => setWarrantyDays(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                صلاحية العرض حتى
              </label>
              <input
                type="date"
                value={validityDate}
                onChange={e => setValidityDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                بنود عرض السعر ({items.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3 min-w-[200px]">الصنف / OEM</th>
                    <th className="p-3 w-20 text-center">الكمية</th>
                    <th className="p-3 w-28 text-center">سعر الوحدة</th>
                    <th className="p-3 w-20 text-center">الخصم %</th>
                    <th className="p-3 w-20 text-center">الضريبة %</th>
                    <th className="p-3 w-28 text-center">الإجمالي</th>
                    <th className="p-3 w-28 text-center">التوفر</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.product_name}
                        </div>
                        {item.oem_number && (
                          <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                            OEM: {item.oem_number}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value) || 1)}
                          className="w-full text-center py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={e => handleUpdateItem(idx, 'unit_price', Number(e.target.value) || 0)}
                          className="w-full text-center py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percentage}
                          onChange={e => handleUpdateItem(idx, 'discount_percentage', Number(e.target.value) || 0)}
                          className="w-full text-center py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-rose-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.tax_percentage}
                          onChange={e => handleUpdateItem(idx, 'tax_percentage', Number(e.target.value) || 0)}
                          className="w-full text-center py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-500"
                        />
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(item.total_price, currency)}
                      </td>
                      <td className="p-3">
                        <select
                          value={item.availability}
                          onChange={e => handleUpdateItem(idx, 'availability', e.target.value as ItemAvailability)}
                          className="w-full py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        >
                          <option value="in_stock">متوفر</option>
                          <option value="on_order">تحت الطلب</option>
                          <option value="unavailable">غير متوفر</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {items.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <p>لا توجد بنود مضافة لعرض السعر حتى الآن.</p>
                </div>
              )}
            </div>
          </div>

          {/* Terms and Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                الشروط والأحكام
              </label>
              <textarea
                rows={3}
                value={terms}
                onChange={e => setTerms(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                placeholder="شروط التسليم والدفع..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                ملاحظات إضافية
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                placeholder="أي توضيحات أو ملاحظات للمشتري..."
              />
            </div>
          </div>
        </div>

        {/* Drawer Footer Summary & Submit */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-slate-400 block">المجموع الفرعي</span>
              <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200" dir="ltr">
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div>
                <span className="text-xs text-rose-500 block">الخصم</span>
                <span className="font-mono font-bold text-sm text-rose-500" dir="ltr">
                  -{formatCurrency(totals.discountAmount, currency)}
                </span>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-400 block">الضريبة</span>
              <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200" dir="ltr">
                {formatCurrency(totals.taxAmount, currency)}
              </span>
            </div>
            <div className="pl-4 border-l border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">الإجمالي النهائي</span>
              <span className="font-mono font-extrabold text-xl text-indigo-600 dark:text-indigo-400" dir="ltr">
                {formatCurrency(totals.grandTotal, currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>

            <button
              onClick={handleSubmit}
              disabled={items.length === 0 || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>إرسال واعتماد المراجعة (#{revisionNumber})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
