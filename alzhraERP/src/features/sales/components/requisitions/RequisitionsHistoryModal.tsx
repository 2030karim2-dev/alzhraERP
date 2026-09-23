/* eslint-disable max-lines-per-function, @typescript-eslint/strict-boolean-expressions */
import React from 'react';
import { History, X, Trash2, ArrowRight, Calendar, User, Package } from 'lucide-react';
import { useRequisitionsStore } from '../../store/requisitionsStore';

interface RequisitionsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequisitionsHistoryModal: React.FC<RequisitionsHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { savedBatches, loadBatch, deleteBatch } = useRequisitionsStore();

  if (!isOpen) return null;

  return (
    <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        dir="rtl"
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <History size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold">سجل الطلبات المحفوظة (المطلوبات)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {savedBatches.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لا توجد طلبات محفوظة حالياً. يمكنك حفظ أي قائمة مطلوبة للرجوع إليها لاحقاً.
            </div>
          ) : (
            <div className="space-y-2">
              {savedBatches.map(batch => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 transition-colors hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {batch.title}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {batch.createdAt}
                      </span>
                      {batch.supplier?.name && (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <User size={12} />
                          {batch.supplier.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Package size={12} />
                        {batch.items.length} صنف
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        loadBatch(batch.id);
                        onClose();
                      }}
                      className="shadow-2xs flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <ArrowRight size={13} />
                      <span>فتح في الجدول</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteBatch(batch.id);
                      }}
                      className="rounded-md p-1.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950"
                      title="حذف من السجل"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
