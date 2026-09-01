import React, { useState, useEffect } from 'react';
import { X, History, FileText } from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import { supplierPortalService } from '../services/supplierPortalService';
import { logger } from '../../../core/utils/logger';
import type { QuotationRevision } from '../types';

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
        const formattedRevs = await supplierPortalService.getQuotationRevisions(quotationId);
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
    <div className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 duration-150">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[var(--app-surface)] shadow-xl dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-indigo-400">
              <History className="h-4 w-4" />
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
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 divide-x divide-x-reverse divide-slate-200 overflow-hidden dark:divide-slate-800">
          {/* Revisions Sidebar List */}
          <div className="w-64 space-y-2 overflow-y-auto border-l border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="mb-1 block px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              المراجعات المحفوظة ({revisions.length})
            </span>

            {revisions.map((rev, index) => {
              const isSelected = selectedRev?.id === rev.id;
              const isLatest = index === 0;

              return (
                <button
                  key={rev.id}
                  type="button"
                  onClick={() => {
                    setSelectedRev(rev);
                  }}
                  className={`w-full rounded-xl border p-2.5 text-right transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-[var(--app-surface)] shadow-sm'
                      : 'border-transparent bg-transparent text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        مراجعة #{rev.revision_number}
                      </span>
                      {isLatest && (
                        <span className="py-0.2 rounded bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          الأحدث
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {rev.created_at.slice(0, 10)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span
                      className="font-mono font-bold text-slate-900 dark:text-slate-200"
                      dir="ltr"
                    >
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
              <div className="py-8 text-center text-xs text-slate-400">لا توجد مراجعات مسجلة</div>
            )}
          </div>

          {/* Selected Revision Snapshot Content */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--app-surface)] p-4">
            {selectedRev ? (
              <>
                {/* Snapshot Header Stats */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 md:grid-cols-4">
                  <div>
                    <span className="block text-[10px] text-slate-400">رقم المراجعة</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      المراجعة #{selectedRev.revision_number}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">الإجمالي الصافي</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatCurrency(selectedRev.total_amount, selectedRev.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">التوريد والضمان</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedRev.delivery_lead_time_days} أيام / {selectedRev.warranty_days} يوم
                      ضمان
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">تاريخ الإصدار</span>
                    <span className="font-mono text-slate-900 dark:text-white" dir="ltr">
                      {new Date(selectedRev.created_at).toLocaleString('ar-SA-u-nu-latn')}
                    </span>
                  </div>
                </div>

                {/* Items Snapshot Table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs dark:border-slate-800">
                  <div className="border-b border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    الأصناف والأسعار في هذه المراجعة
                  </div>

                  <table className="w-full text-right text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/50 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/30">
                      <tr>
                        <th className="w-8 p-2 text-center">#</th>
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
                          <td className="p-2 text-center font-mono text-[11px] text-slate-400">
                            {i + 1}
                          </td>
                          <td className="p-2 font-bold text-slate-900 dark:text-white">
                            {item.product_name}
                            {item.oem_number && (
                              <span className="block font-mono text-[10px] font-normal text-slate-400">
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
                          <td
                            className="p-2 text-center font-mono font-bold text-slate-900 dark:text-white"
                            dir="ltr"
                          >
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
                  <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    {selectedRev.terms_and_conditions && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                        <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                          الشروط والأحكام:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400">
                          {selectedRev.terms_and_conditions}
                        </p>
                      </div>
                    )}
                    {selectedRev.notes && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                        <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
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
                <FileText className="mx-auto mb-2 h-8 w-8 stroke-[1.5] text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  اختر مراجعة من القائمة لعرض تفاصيلها
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-[var(--app-surface)] px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
