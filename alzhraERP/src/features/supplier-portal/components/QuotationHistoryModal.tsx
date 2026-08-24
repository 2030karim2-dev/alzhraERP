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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                سجل المراجعات التاريخية لعرض السعر ({quotationNumber})
              </h2>
              <p className="text-xs text-slate-400">
                لقطات تاريخية مجمدة (Immutable Snapshots) توثق كافة التغييرات والأسعار والبنود
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

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800">
          {/* Revisions Sidebar List */}
          <div className="w-72 bg-slate-50 dark:bg-slate-950 p-4 overflow-y-auto space-y-2.5 border-l border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block px-2 mb-2">
              المراجعات المحفوظة ({revisions.length})
            </span>

            {revisions.map((rev, index) => {
              const isSelected = selectedRev?.id === rev.id;
              const isLatest = index === 0;

              return (
                <button
                  key={rev.id}
                  onClick={() => setSelectedRev(rev)}
                  className={`w-full text-right p-3.5 rounded-2xl transition-all border ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-transparent hover:bg-white/60 dark:hover:bg-slate-900/40 border-transparent text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        مراجعة #{rev.revision_number}
                      </span>
                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                          الأحدث
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {rev.created_at.slice(0, 10)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
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
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                لا توجد مراجعات سابقة مسجلة
              </div>
            )}
          </div>

          {/* Selected Revision Snapshot Details */}
          <div className="flex-1 bg-white dark:bg-slate-900 p-6 overflow-y-auto space-y-6">
            {selectedRev ? (
              <>
                {/* Snapshot Header Stats */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        تفاصيل المراجعة رقم #{selectedRev.revision_number}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                        {selectedRev.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">
                      تاريخ الإنشاء: {new Date(selectedRev.created_at).toLocaleString('ar-SA')}
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[10px] text-slate-400 block">مدة التوريد</span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {selectedRev.delivery_lead_time_days} أيام
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">الضمان</span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {selectedRev.warranty_days} يوم
                      </span>
                    </div>

                    <div className="text-left border-r pr-6 border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">الإجمالي النهائي</span>
                      <span className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400" dir="ltr">
                        {formatCurrency(selectedRev.total_amount, selectedRev.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Snapshot Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>جدول بنود اللقطة التاريخية ({selectedRev.items_snapshot.length} صنف)</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">اسم المنتج / الصنف</th>
                          <th className="p-3">رقم OEM</th>
                          <th className="p-3 text-center">الكمية</th>
                          <th className="p-3 text-left">سعر الوحدة</th>
                          <th className="p-3 text-center">الخصم %</th>
                          <th className="p-3 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedRev.items_snapshot.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                              {item.product_name || item.description || 'صنف'}
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              {item.oem_number || '---'}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.quantity} {item.unit_of_measure}
                            </td>
                            <td className="p-3 text-left font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                              {formatCurrency(item.unit_price, selectedRev.currency)}
                            </td>
                            <td className="p-3 text-center font-mono text-slate-500">
                              {item.discount_percentage || 0}%
                            </td>
                            <td className="p-3 text-left font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                              {formatCurrency(item.total_price, selectedRev.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes & Terms if any */}
                {(selectedRev.notes || selectedRev.terms_and_conditions) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {selectedRev.notes && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          ملاحظات المراجعة:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {selectedRev.notes}
                        </p>
                      </div>
                    )}

                    {selectedRev.terms_and_conditions && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          الشروط والأحكام:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {selectedRev.terms_and_conditions}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-24 text-center text-slate-400">
                <FileText className="w-12 h-12 stroke-[1.5] mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  اختر مراجعة من القائمة لعرض لقطتها التاريخية
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
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
