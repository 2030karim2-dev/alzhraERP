import React from 'react';
import Button from '../../../../ui/base/Button';

interface PartsAddedSuccessAlertProps {
  lastAddedCount: number;
  onNavigateToInventory?: (() => void) | undefined;
  onDismiss: () => void;
}

export const PartsAddedSuccessAlert: React.FC<PartsAddedSuccessAlertProps> = React.memo(
  ({ lastAddedCount, onNavigateToInventory, onDismiss }) => (
    <div className="animate-in fade-in flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-900 shadow-sm duration-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
          ✓
        </div>
        <p className="text-xs font-bold">
          تم بنجاح إضافة وتحديث{' '}
          <span className="font-bold underline decoration-2">{lastAddedCount}</span> قطعة في المخزون
          وشبكة التوافق لهذه المركبة!
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onNavigateToInventory && (
          <Button
            size="sm"
            variant="success"
            onClick={onNavigateToInventory}
            className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold shadow-sm hover:bg-emerald-800"
          >
            عرض في المخزون المتطابق →
          </Button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="px-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          aria-label="إغلاق التنبيه"
        >
          ✕
        </button>
      </div>
    </div>
  )
);

PartsAddedSuccessAlert.displayName = 'PartsAddedSuccessAlert';
