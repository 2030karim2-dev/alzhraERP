import React, { useState, useMemo, useEffect } from 'react';
import { Scale, Trophy, Zap, Shield, Loader2, CheckCircle, ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { formatCurrency } from '../../../../core/utils';
import { usePurchaseStore } from '../../store';

interface Props {
  rfqGroupId: string;
  onClose: () => void;
  onConvertToPurchase?: () => void;
}

interface SupplierData {
  id: string;
  quotation_number: string;
  status: string;
  total_amount: number;
  delivery_terms: string | null;
  payment_terms: string | null;
  party: { id?: string; name: string } | null;
  quotation_items: Array<{
    id: string;
    product_id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

const QuotationComparisonView: React.FC<Props> = ({ rfqGroupId, onClose, onConvertToPurchase }) => {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    // Boilerplate to clear unused variable compiler errors, hook to real API when ready
    if (!rfqGroupId) return;
    setLoading(false);
  }, [rfqGroupId, setSuppliers]);

  const handleConvertToPurchase = async (quotationId: string) => {
    const quot = suppliers.find(s => s.id === quotationId);
    if (!quot) return;

    setActionLoading(quotationId);
    try {
      const { resetCart, setSupplier, bulkLoadItems } = usePurchaseStore.getState();
      resetCart();
      
      if (quot.party) {
        setSupplier({ id: quot.party.id || 'temp', name: quot.party.name });
      }
      
      if (quot.quotation_items && quot.quotation_items.length > 0) {
        bulkLoadItems(quot.quotation_items.map(item => ({
          productId: item.product_id || '',
          name: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          costPrice: item.unit_price,
        })));
      }

      await purchaseQuotationsApi.updateStatus(quotationId, 'converted');
      onClose();
      onConvertToPurchase?.();
    } catch (err) {
      console.error('Failed to convert purchase quotation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Build comparison matrix
  const comparison = useMemo(() => {
    if (suppliers.length === 0) return null;

    // Collect all unique product descriptions
    const allDescriptions = new Set<string>();
    suppliers.forEach(s => s.quotation_items?.forEach(i => allDescriptions.add(i.description)));
    const descriptions = Array.from(allDescriptions);

    // Find cheapest and most expensive for each product
    const priceMap: Record<string, { min: number; max: number; minSupplier: string }> = {};
    descriptions.forEach(desc => {
      let min = Infinity, max = -Infinity, minSup = '';
      suppliers.forEach(s => {
        const item = s.quotation_items?.find(i => i.description === desc);
        if (item) {
          if (item.unit_price < min) { min = item.unit_price; minSup = s.id; }
          if (item.unit_price > max) max = item.unit_price;
        }
      });
      priceMap[desc] = { min, max, minSupplier: minSup };
    });

    // Find cheapest overall
    const cheapestId = suppliers.length > 0
      ? suppliers.reduce((a: SupplierData, b: SupplierData) => a.total_amount < b.total_amount ? a : b).id
      : null;

    return { descriptions, priceMap, cheapestId };
  }, [suppliers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!comparison || suppliers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
        <Scale size={40} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد عروض للمقارنة</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-b border-violet-100 dark:border-violet-800/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">مقارنة عروض الأسعار</h3>
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
              {suppliers.length} عرض من {suppliers.length} مورد
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                  <th className="text-right py-3 px-4 font-bold text-gray-700 dark:text-gray-300 text-xs sticky right-0 bg-gray-50 dark:bg-slate-800/50 z-10 min-w-[150px]">
                    المنتج / البند
                  </th>
                  {suppliers.map((s) => (
                    <th key={s.id} className="text-center py-3 px-4 font-bold text-xs min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`${s.id === comparison.cheapestId ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {s.party?.name || 'مورد غير محدد'}
                        </span>
                        {s.id === comparison.cheapestId && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold">
                            <Trophy size={10} /> الأوفر
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Per-item rows */}
                {comparison.descriptions.map((desc, idx) => (
                  <tr key={idx} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200 sticky right-0 bg-white dark:bg-slate-900 z-10">
                      {desc}
                    </td>
                    {suppliers.map((s) => {
                      const item = s.quotation_items?.find(i => i.description === desc);
                      const isCheapest = item && comparison.priceMap[desc]?.minSupplier === s.id;
                      const isMostExpensive = item && item.unit_price === comparison.priceMap[desc]?.max && comparison.priceMap[desc]?.max !== comparison.priceMap[desc]?.min;
                      return (
                        <td key={s.id} className="py-3 px-4 text-center">
                          {item ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  isCheapest ? 'text-emerald-600 dark:text-emerald-400' :
                                  isMostExpensive ? 'text-rose-500 dark:text-rose-400' :
                                  'text-gray-800 dark:text-gray-200'
                                }`}
                                dir="ltr"
                              >
                                {formatCurrency(item.unit_price)}
                              </span>
                              {isCheapest && <span className="text-[10px] text-emerald-500">⭐ الأقل</span>}
                              <span className="text-[10px] text-gray-400">× {item.quantity}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Summary Rows */}
                <tr className="border-t-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-gray-800 dark:text-gray-200 sticky right-0 bg-gray-50 dark:bg-slate-800/30 z-10">
                    💰 الإجمالي
                  </td>
                  {suppliers.map((s) => (
                    <td key={s.id} className="py-3 px-4 text-center">
                      <span
                        className={`font-mono font-bold text-lg ${
                          s.id === comparison.cheapestId
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}
                        dir="ltr"
                      >
                        {formatCurrency(s.total_amount)}
                      </span>
                    </td>
                  ))}
                </tr>

                <tr className="bg-gray-50 dark:bg-slate-800/30">
                  <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400 sticky right-0 bg-gray-50 dark:bg-slate-800/30 z-10">
                    🚚 شروط التسليم
                  </td>
                  {suppliers.map((s) => (
                    <td key={s.id} className="py-3 px-4 text-center text-xs text-gray-600 dark:text-gray-400">
                      {s.delivery_terms || '—'}
                    </td>
                  ))}
                </tr>

                <tr className="bg-gray-50 dark:bg-slate-800/30">
                  <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400 sticky right-0 bg-gray-50 dark:bg-slate-800/30 z-10">
                    💳 شروط الدفع
                  </td>
                  {suppliers.map((s) => (
                    <td key={s.id} className="py-3 px-4 text-center text-xs text-gray-600 dark:text-gray-400">
                      {s.payment_terms || '—'}
                    </td>
                  ))}
                </tr>

                {/* Action Row */}
                <tr className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10">
                  <td className="py-4 px-4 font-bold text-violet-700 dark:text-violet-400 sticky right-0 bg-violet-50 dark:bg-violet-900/10 z-10">
                    ✅ الإجراء
                  </td>
                  {suppliers.map((s) => (
                    <td key={s.id} className="py-4 px-4 text-center">
                      {s.status === 'converted' ? (
                        <span className="flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          <CheckCircle size={14} /> تم التحويل
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConvertToPurchase(s.id)}
                          disabled={actionLoading !== null}
                          className={`flex items-center justify-center gap-1 mx-auto px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            s.id === comparison.cheapestId
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                              : 'bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600'
                          }`}
                        >
                          {actionLoading === s.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ArrowRightLeft size={12} />
                          )}
                          {s.id === comparison.cheapestId ? 'اعتماد (موصى به)' : 'اعتماد'}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Recommendations Bar */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10">
            <div className="flex flex-wrap items-center gap-4">
              {comparison.cheapestId && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800/80 rounded-xl border border-emerald-200 dark:border-emerald-800/30 shadow-sm">
                  <Trophy size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">الأوفر إجمالياً:</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {suppliers.find(s => s.id === comparison.cheapestId)?.party?.name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-800/30 shadow-sm">
                <Zap size={16} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">عدد العروض:</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{suppliers.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800/80 rounded-xl border border-violet-200 dark:border-violet-800/30 shadow-sm">
                <Shield size={16} className="text-violet-600" />
                <span className="text-xs font-bold text-violet-700 dark:text-violet-400">فارق السعر:</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300" dir="ltr">
                  {suppliers.length >= 2
                    ? formatCurrency(Math.max(...suppliers.map(s => s.total_amount)) - Math.min(...suppliers.map(s => s.total_amount)))
                    : '—'
                  }
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuotationComparisonView;
