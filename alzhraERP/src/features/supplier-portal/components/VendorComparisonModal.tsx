import React, { useState } from 'react';
import {
  X,
  Trophy,
  ShoppingCart,
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
  onConvertedSuccessfully: (po: { po_id: string; po_number: string }) => void;
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

  // Compute multi-criteria scores
  const scoredVendors: ComparisonVendorScore[] = React.useMemo(() => {
    return supplierPortalService.calculateComparisonMatrix(quotations);
  }, [quotations]);

  const handleConvertToPO = async (quotationId: string) => {
    setIsConverting(quotationId);
    setError(null);

    try {
      const res = await supplierPortalService.convertQuotationToPO({
        companyId,
        quotationId,
        notes: 'تم التحويل آلياً عبر مصفوفة المفاضلة الذكية للموردين.',
      });

      if (res.success) {
        onConvertedSuccessfully({ po_id: res.po_id, po_number: res.po_number });
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر تحويل عرض السعر إلى أمر شراء.');
    } finally {
      setIsConverting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-[var(--app-surface)] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                مصفوفة المقارنة الذكية للموردين (Smart Vendor Matrix)
              </h2>
              <p className="text-[11px] text-slate-400">
                مفاضلة آلية بناءً على السعر، سرعة التوريد، التوفر، وفترة الضمان
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Scored Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scoredVendors.map(vendor => (
              <div
                key={vendor.quotation_id}
                className={`relative rounded-xl p-4 border transition-colors flex flex-col justify-between ${
                  vendor.is_recommended
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-emerald-500/80 dark:border-emerald-500/60'
                    : 'bg-[var(--app-surface)] border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {vendor.is_recommended && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 mb-2.5 bg-emerald-600 text-white text-[10px] font-bold rounded-md">
                      <Trophy className="w-3 h-3" />
                      <span>المورد الموصى به (#{vendor.rank})</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                        {vendor.supplier_name}
                      </h3>
                      <span className="font-mono text-[10px] text-slate-400">
                        {vendor.quotation_number}
                      </span>
                    </div>

                    <div className="text-left">
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(vendor.total_amount, vendor.currency)}
                      </div>
                      <span className="text-[10px] text-slate-400">صافي السعر</span>
                    </div>
                  </div>

                  {/* Score Bars */}
                  <div className="space-y-2 my-3 bg-slate-100/60 dark:bg-slate-800/60 p-2.5 rounded-lg text-[11px]">
                    <div>
                      <div className="flex justify-between font-medium text-slate-600 dark:text-slate-300 mb-0.5">
                        <span>نقاط السعر (40%)</span>
                        <span className="font-mono">{vendor.price_score}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${vendor.price_score}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium text-slate-600 dark:text-slate-300 mb-0.5">
                        <span>سرعة التوصيل ({vendor.delivery_lead_time_days} أيام)</span>
                        <span className="font-mono">{vendor.delivery_score}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${vendor.delivery_score}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium text-slate-600 dark:text-slate-300 mb-0.5">
                        <span>نسبة التوفر بالمخزون</span>
                        <span className="font-mono">{vendor.availability_rate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${vendor.availability_rate}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {vendor.badges.is_lowest_price && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/50">
                        الأوفر سعراً
                      </span>
                    )}
                    {vendor.badges.is_fastest_delivery && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/50">
                        الأسرع تسليماً
                      </span>
                    )}
                    {vendor.badges.is_best_warranty && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200/50">
                        ضمان ({vendor.warranty_days} يوم)
                      </span>
                    )}
                  </div>
                </div>

                {/* Convert Button */}
                <button
                  type="button"
                  onClick={() => handleConvertToPO(vendor.quotation_id)}
                  disabled={isConverting === vendor.quotation_id}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                    vendor.is_recommended
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 text-slate-700 hover:text-white dark:text-slate-300'
                  }`}
                >
                  {isConverting === vendor.quotation_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  )}
                  <span>اعتماد وتحويل لأمر شراء</span>
                </button>
              </div>
            ))}
          </div>

          {scoredVendors.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs font-medium">لا توجد عروض أسعار كافية للمقارنة حالياً.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
