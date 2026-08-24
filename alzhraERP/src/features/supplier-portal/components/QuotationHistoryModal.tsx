import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { QuotationRevision, QuotationItemDraft } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  quotationNumber: string;
}

export const QuotationHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quotationId,
  quotationNumber,
}) => {
  const [revisions, setRevisions] = useState<QuotationRevision[]>([]);
  const [selectedRev, setSelectedRev] = useState<QuotationRevision | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !quotationId) return;

    const fetchRevisions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('prc_quotation_revisions')
          .select('*')
          .eq('quotation_id', quotationId)
          .order('revision_number', { ascending: false });

        if (error) throw error;

        const formattedRevs = (data || []).map((r): QuotationRevision => ({
          id: r.id,
          quotation_id: r.quotation_id,
          revision_number: r.revision_number,
          status: r.status,
          subtotal: Number(r.subtotal) || 0,
          discount_amount: Number(r.discount_amount) || 0,
          tax_amount: Number(r.tax_amount) || 0,
          total_amount: Number(r.total_amount) || 0,
          currency: r.currency || 'SAR',
          delivery_lead_time_days: Number(r.delivery_lead_time_days) || 0,
          warranty_days: Number(r.warranty_days) || 0,
          notes: r.notes ?? null,
          terms_and_conditions: r.terms_and_conditions ?? null,
          items_snapshot: Array.isArray(r.items_snapshot)
            ? (r.items_snapshot as unknown as QuotationItemDraft[])
            : [],
          created_at: r.created_at,
        }));

        setRevisions(formattedRevs);
        if (formattedRevs.length > 0) {
          setSelectedRev(formattedRevs[0]);
        }
      } catch (err) {
        logger.error('QuotationHistoryModal', 'Failed to load quotation revisions', err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchRevisions();
  }, [isOpen, quotationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                سجل المراجعات التاريخية لعرض السعر ({quotationNumber})
              </h2>
              <p className="text-[11px] text-slate-400">
                لقطات تاريخية مجمدة توثق كافة التغييرات والأسعار والبنود
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

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800">
          {/* Revisions Sidebar List */}
          <div className="w-64 bg-slate-50 dark:bg-slate-950 p-3 overflow-y-auto space-y-2 border-l border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1">
              المراجعات المحفوظة ({revisions.length})
            </span>

            {revisions.map((rev, index) => {
              const isSelected = selectedRev?.id === rev.id;
              const isLatest = index === 0;

              return (
                <button
                  key={rev.id}
                  type="button"
                  onClick={() => setSelectedRev(rev)}
                  className={`w-full text-right p-2.5 rounded-xl transition-colors border ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-sm'
                      : 'bg-transparent hover:bg-white/60 dark:hover:bg-slate-900/40 border-transparent text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        مراجعة #{rev.revision_number}
                      </span>
                      {isLatest && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                          الأحدث
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {rev.created_at.slice(0, 10)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-200" dir="ltr">
                      {formatCurrency(rev.total_amount, rev.currency)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {rev.items_snapshot.length} أصناف
                    </span>
                  </div>
                </button>
              );
            })}

            {revisions.length === 0 && !isLoading && (
              <div className="py-8 text-center text-xs text-slate-400">
                لا توجد مراجعات مسجلة
              </div>
            )}
          </div>

          {/* Selected Revision Snapshot Content */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white dark:bg-slate-900">
            {selectedRev ? (
              <>
                {/* Snapshot Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">رقم المراجعة</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      المراجعة #{selectedRev.revision_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الإجمالي الصافي</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatCurrency(selectedRev.total_amount, selectedRev.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">التوريد والضمان</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedRev.delivery_lead_time_days} أيام / {selectedRev.warranty_days} يوم ضمان
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">تاريخ الإصدار</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {new Date(selectedRev.created_at).toLocaleString('ar-SA')}
                    </span>
                  </div>
                </div>

                {/* Items Snapshot Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200">
                    الأصناف والأسعار في هذه المراجعة
                  </div>

                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[11px]">
                      <tr>
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2">الصنف / OEM</th>
                        <th className="p-2 text-center">الكمية</th>
                        <th className="p-2 text-center">سعر الوحدة</th>
                        <th className="p-2 text-center">الخصم %</th>
                        <th className="p-2 text-center">الإجمالي</th>
                        <th className="p-2 text-center">التوفر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedRev.items_snapshot.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                          <td className="p-2 font-bold text-slate-900 dark:text-white">
                            {item.product_name}
                            {item.oem_number && (
                              <span className="block font-mono text-[10px] text-slate-400 font-normal">
                                OEM: {item.oem_number}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono">{item.quantity}</td>
                          <td className="p-2 text-center font-mono" dir="ltr">
                            {formatCurrency(item.unit_price, selectedRev.currency)}
                          </td>
                          <td className="p-2 text-center font-mono text-rose-500">
                            {item.discount_percentage ? `${item.discount_percentage}%` : '0%'}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                            {formatCurrency(item.total_price, selectedRev.currency)}
                          </td>
                          <td className="p-2 text-center text-[11px]">
                            {item.availability === 'in_stock' ? 'متوفر' : 'تحت الطلب'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Notes & Terms */}
                {(selectedRev.terms_and_conditions || selectedRev.notes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {selectedRev.terms_and_conditions && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                          الشروط والأحكام:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400">{selectedRev.terms_and_conditions}</p>
                      </div>
                    )}
                    {selectedRev.notes && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                          ملاحظات المراجعة:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400">{selectedRev.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <FileText className="w-8 h-8 stroke-[1.5] mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  اختر مراجعة من القائمة لعرض تفاصيلها
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
