import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Wifi,
  History,
  CloudOff,
} from 'lucide-react';
import { syncStore } from '../../core/lib/sync-store';
import { logger } from '../../core/utils/logger';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SyncStatusModal: React.FC<SyncStatusModalProps> = ({ isOpen, onClose }) => {
  const [pending, setPending] = useState<any[]>([]);

  const loadPending = async () => {
    try {
      const data = await syncStore.getPending();
      setPending(data);
    } catch (error) {
      logger.error('SyncStatusModal', 'Failed to load pending mutations:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    loadPending();
    // Poll for changes while open
    const interval = setInterval(loadPending, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [isOpen]);

  const handleRemove = async (id: string) => {
    await syncStore.dequeue(id);
    loadPending();
  };

  const getLabel = (mutationKey: any[]) => {
    const [feature, action] = mutationKey;
    const labels: Record<string, string> = {
      'products:save': 'حفظ منتج',
      'sales:create': 'إنشاء فاتورة مبيعات',
      'expenses:create': 'تسجيل مصروف',
      'purchases:create': 'فاتورة مشتريات',
      'purchases:payment': 'سند صرف مورد',
      'accounting:create_account': 'إنشاء حساب محاسبي',
    };
    return labels[`${feature}:${action}`] || `${feature} ${action}`;
  };

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">مركز المزامنة</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إدارة العمليات المعلقة في وضع عدم الاتصال
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                جميع البيانات متزامنة
              </h3>
              <p className="mt-1 text-slate-500 dark:text-slate-400">لا توجد عمليات معلقة حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  العمليات المعلقة ({pending.length})
                </span>
                <button
                  onClick={loadPending}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <RefreshCcw size={12} /> تحديث القائمة
                </button>
              </div>

              {pending.map(item => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-blue-700"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-lg p-2 ${
                        item.retryCount > 0
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.retryCount > 0 ? <AlertCircle size={18} /> : <CloudOff size={18} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {getLabel(item.mutationKey)}
                      </h4>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-500">
                          ID: {item.id.substring(0, 8)}
                        </span>
                        {item.retryCount > 0 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            فشل المحاولة: {item.retryCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20 max-md:opacity-100 md:opacity-0"
                      title="حذف العملية"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Wifi size={14} className="text-emerald-500" />
            <span>سيتم المزامنة تلقائياً عند استقرار الاتصال</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-slate-900"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncStatusModal;
