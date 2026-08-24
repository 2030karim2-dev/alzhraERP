import React, { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, Clock, Check, X, Loader2 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../../auth/store';
import type { EntityCardMetadata } from '../../types';

interface Props {
  messageId: string;
  metadata: EntityCardMetadata;
}

export const TransferCard: React.FC<Props> = ({ messageId, metadata }) => {
  const { executeAction } = useChatStore();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const details = metadata.details || {};
  const transferNumber = (details.transfer_number as string) || metadata.title;
  const fromBranch = (details.from_branch as string) || 'فرع المصدر';
  const toBranch = (details.to_branch as string) || 'فرع الوجهة';
  const itemName = (details.item_name as string) || 'صنف غير محدد';
  const quantity = Number(details.quantity || 1);

  const status = metadata.action_status || 'pending';
  const isManager = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager';

  const handleAction = async (action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      await executeAction(messageId, action);
    } catch (err) {
      // Error handled in store
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="my-2 max-w-sm rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--app-border)]/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <ArrowLeftRight size={18} />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-[var(--app-text)]">{transferNumber}</span>
            <p className="text-xs font-semibold text-[var(--app-text)]">طلب مناقلة مخزون</p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {status === 'pending' && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <Clock size={11} /> قيد الانتظار
            </span>
          )}
          {status === 'approved' && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={11} /> تمت الموافقة
            </span>
          )}
          {status === 'rejected' && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
              <XCircle size={11} /> مرفوض
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between rounded-lg bg-[var(--app-bg)] p-2">
          <span className="text-[11px] text-[var(--app-text-secondary)]">الصنف:</span>
          <strong className="text-[var(--app-text)]">{itemName} ({quantity} قطعة)</strong>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
          <div className="rounded-lg bg-[var(--app-bg)] p-1.5">
            <span className="block text-[9px] text-[var(--app-text-secondary)]">من</span>
            <strong className="text-[var(--app-text)]">{fromBranch}</strong>
          </div>
          <div className="rounded-lg bg-[var(--app-bg)] p-1.5">
            <span className="block text-[9px] text-[var(--app-text-secondary)]">إلى</span>
            <strong className="text-[var(--app-text)]">{toBranch}</strong>
          </div>
        </div>
      </div>

      {/* Action Buttons for Managers when Pending */}
      {status === 'pending' && isManager && (
        <div className="mt-3 flex gap-2 border-t border-[var(--app-border)]/60 pt-2.5">
          <button
            onClick={() => handleAction('approve')}
            disabled={isProcessing}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            موافقة وتحويل
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={isProcessing}
            className="flex items-center justify-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 active:scale-95 disabled:opacity-50"
          >
            <X size={14} />
            رفض
          </button>
        </div>
      )}
    </div>
  );
};
