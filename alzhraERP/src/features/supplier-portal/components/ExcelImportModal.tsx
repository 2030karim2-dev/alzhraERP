import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { parseQuotationExcel } from '../services/excelEngine';
import type { VendorProductItem, ExcelImportRow, QuotationItemDraft } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allProducts: VendorProductItem[];
  onImportComplete: (matchedItems: QuotationItemDraft[]) => void;
}

export const ExcelImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  allProducts,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExcelImportRow[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setIsLoading(true);

    try {
      const parsed = await parseQuotationExcel(selected, allProducts);
      setRows(parsed);
    } catch (err: any) {
      setError(err?.message || 'تعذر قراءة ملف الإكسل. يرجى التأكد من التنسيق.');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const matchedCount = rows.filter(r => r.matchStatus === 'matched').length;
  const unmatchedCount = rows.filter(r => r.matchStatus === 'unmatched').length;
  const invalidCount = rows.filter(r => r.matchStatus !== 'matched' && r.matchStatus !== 'unmatched').length;

  const handleConfirmImport = () => {
    const matchedOnly = rows
      .filter(r => r.matchStatus === 'matched' && r.matchedProduct)
      .map((r): QuotationItemDraft => ({
        product_id: r.matchedProduct!.id,
        product_name: r.matchedProduct!.name,
        oem_number: r.matchedProduct!.part_number,
        vendor_sku: r.rawVendorSku || null,
        quantity: r.quantity,
        unit_of_measure: 'حبة',
        unit_price: r.unitPrice,
        discount_percentage: r.discountPercentage || 0,
        discount_amount: 0,
        tax_percentage: r.taxPercentage || 15,
        tax_amount: 0,
        net_unit_price: r.unitPrice,
        total_price: r.quantity * r.unitPrice,
        availability: r.availability || 'in_stock',
        lead_time_days: r.leadTimeDays || 0,
        warranty_days: r.warrantyDays || 30,
        vendor_notes: r.notes || '',
      }));

    onImportComplete(matchedOnly);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                استيراد وتدقيق عروض الأسعار من Excel
              </h3>
              <p className="text-xs text-slate-400">
                مطابقة تلقائية برقم القطعة (OEM)، كود المورد (SKU)، أو معرف الصنف
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* File Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              id="excel-upload"
              className="hidden"
            />
            <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <UploadCloud className="w-10 h-10 text-emerald-500 stroke-[1.5]" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {file ? file.name : 'انقر لاختيار ملف Excel أو اسحبه إلى هنا'}
              </div>
              <p className="text-xs text-slate-400">
                يدعم صيغ .xlsx, .xls (قوالب عروض الأسعار المعتمدة)
              </p>
            </label>
          </div>

          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs font-semibold">جاري قراءة وتدقيق الأصناف...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
              <XCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Validation Summary Cards */}
          {rows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                      أصناف مطابقة
                    </span>
                    <span className="font-mono text-xl font-black text-emerald-600">
                      {matchedCount}
                    </span>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>

                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">
                      غير مطابقة
                    </span>
                    <span className="font-mono text-xl font-black text-amber-600">
                      {unmatchedCount}
                    </span>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>

                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                      أخطاء / تكرار
                    </span>
                    <span className="font-mono text-xl font-black text-rose-600">
                      {invalidCount}
                    </span>
                  </div>
                  <XCircle className="w-6 h-6 text-rose-500" />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="p-2.5">سطر</th>
                      <th className="p-2.5">البيانات المقروءة</th>
                      <th className="p-2.5">الصنف المطابق بالنظام</th>
                      <th className="p-2.5 text-center">الكمية</th>
                      <th className="p-2.5 text-center">السعر</th>
                      <th className="p-2.5 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono text-slate-400">{row.rowNumber}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {row.rawProductIdentifier}
                          </div>
                          {row.rawPartNumber && (
                            <div className="font-mono text-[10px] text-slate-400">
                              OEM: {row.rawPartNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          {row.matchedProduct ? (
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">
                              {row.matchedProduct.name}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">لا يوجد تطابق</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-bold">{row.quantity}</td>
                        <td className="p-2.5 text-center font-mono font-bold">{row.unitPrice}</td>
                        <td className="p-2.5 text-center">
                          {row.matchStatus === 'matched' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] font-bold">
                              مطابق
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 text-[10px] font-bold">
                              {row.validationError || 'غير مطابق'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
          >
            إغلاق
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={matchedCount === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>إضافة البنود المطابقة ({matchedCount}) إلى عرض السعر</span>
          </button>
        </div>
      </div>
    </div>
  );
};
