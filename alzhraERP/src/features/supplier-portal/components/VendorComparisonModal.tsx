import React, { useState } from 'react';
import {
  X,
  Trophy,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import { supplierPortalService } from '../services/supplierPortalService';
import type { VendorQuotation, ComparisonVendorScore } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotations: VendorQuotation[];
  companyId: string;
  onConvertedSuccessfully: (poInfo: { po_id: string; po_number: string }) => void;
}

export const VendorComparisonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quotations,
  companyId,
  onConvertedSuccessfully,
}) => {
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute Comparison Matrix
  const scoredVendors: ComparisonVendorScore[] = React.useMemo(() => {
    return supplierPortalService.calculateComparisonMatrix(quotations);
  }, [quotations]);

  const handleConvertToPO = async (quotationId: string) => {
    setIsConverting(quotationId);
    setError(null);

    try {
      const result = await supplierPortalService.convertQuotationToPO({
        companyId,
        quotationId,
      });

      onConvertedSuccessfully({
        po_id: result.po_id,
        po_number: result.po_number,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر تحويل عرض السعر إلى أمر شراء.');
    } finally {
      setIsConverting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-violet-950 via-slate-900 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                مصفوفة المقارنة الذكية للموردين (Smart Vendor Matrix)
              </h2>
              <p className="text-xs text-slate-400">
                تحليل دقيق ومفاضلة آلية بناءً على السعر، سرعة التوريد، التوفر بالمخزون، والضمان
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Scored Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scoredVendors.map(vendor => (
              <div
                key={vendor.quotation_id}
                className={`relative rounded-2xl p-5 border transition-all ${
                  vendor.is_recommended
                    ? 'bg-gradient-to-b from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-500 shadow-xl shadow-emerald-500/10'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                {vendor.is_recommended && (
                  <div className="absolute -top-3 right-6 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-extrabold rounded-full shadow-md flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    المورد الموصى به (المركز #{vendor.rank})
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {vendor.supplier_name}
                    </h3>
                    <span className="font-mono text-xs text-slate-400">
                      {vendor.quotation_number}
                    </span>
                  </div>

                  <div className="text-left">
                    <div className="font-mono font-black text-lg text-slate-900 dark:text-white" dir="ltr">
                      {formatCurrency(vendor.total_amount, vendor.currency)}
                    </div>
                    <span className="text-[10px] text-slate-400">شامل الضرائب</span>
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-2.5 my-4 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl text-xs">
                  <div>
                    <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      <span>نقاط السعر (40%)</span>
                      <span className="font-mono">{vendor.price_score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${vendor.price_score}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      <span>سرعة التوصيل ({vendor.delivery_lead_time_days} أيام)</span>
                      <span className="font-mono">{vendor.delivery_score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${vendor.delivery_score}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      <span>نسبة التوفر بالمخزون</span>
                      <span className="font-mono">{vendor.availability_rate}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${vendor.availability_rate}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {vendor.badges.is_lowest_price && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      الأوفر سعراً
                    </span>
                  )}
                  {vendor.badges.is_fastest_delivery && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                      الأسرع تسليماً
                    </span>
                  )}
                  {vendor.badges.is_best_warranty && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                      أطول ضمان ({vendor.warranty_days} يوم)
                    </span>
                  )}
                </div>

                {/* Convert to PO Action Button */}
                <button
                  onClick={() => handleConvertToPO(vendor.quotation_id)}
                  disabled={isConverting !== null}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                    vendor.is_recommended
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                  }`}
                >
                  {isConverting === vendor.quotation_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4" />
                  )}
                  <span>اعتماد وتحويل لأمر شراء (Convert to PO)</span>
                </button>
              </div>
            ))}
          </div>

          {/* Side by Side Line Comparison Matrix Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-200">
              المقارنة التفصيلية لأسعار البنود
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">اسم الصنف / البند</th>
                    <th className="p-3 text-center">الكمية المطلوبة</th>
                    {scoredVendors.map(v => (
                      <th key={v.quotation_id} className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {v.supplier_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scoredVendors[0]?.items.map((item, itemIdx) => {
                    const prices = scoredVendors.map(v => v.items[itemIdx]?.unit_price || 0);
                    const minItemPrice = Math.min(...prices.filter(p => p > 0));

                    return (
                      <tr key={itemIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.product_name}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-500">
                          {item.quantity}
                        </td>
                        {scoredVendors.map(v => {
                          const vendorItem = v.items[itemIdx];
                          const isLowest = vendorItem?.unit_price === minItemPrice && minItemPrice > 0;

                          return (
                            <td key={v.quotation_id} className="p-3 text-center">
                              <div className="flex flex-col items-center">
                                <span
                                  className={`font-mono font-bold ${
                                    isLowest
                                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded'
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                  dir="ltr"
                                >
                                  {formatCurrency(vendorItem?.unit_price || 0, v.currency)}
                                </span>
                                {isLowest && (
                                  <span className="text-[9px] text-emerald-600 font-extrabold mt-0.5">
                                    الأقل
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
