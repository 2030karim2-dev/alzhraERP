import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import type { SecurityAlertLog } from '../../types';

interface ResolveAlertDialogProps {
  alert: SecurityAlertLog;
  isResolving: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void> | void;
}

/** نافذة تأكيد معالجة تنبيه أمني — تدير ملاحظات المعالجة داخلياً وتُبلّغ الأب عند التأكيد. */
export const ResolveAlertDialog: React.FC<ResolveAlertDialogProps> = ({
  alert,
  isResolving,
  onClose,
  onConfirm,
}) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <h3 className="text-xs font-black text-[var(--app-text)]">
              تأكيد معالجة التنبيه الأمني #{alert.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3 p-5 text-xs">
          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[var(--app-text)]">{alert.alert_type}</span>
              <span className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                IP:{' '}
                {alert.source_ip !== null && alert.source_ip !== '' ? alert.source_ip : 'غير معروف'}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px] font-bold text-[var(--app-text-secondary)]">
                ملاحظات وإجراءات المعالجة (اختياري):
              </label>
              <div className="flex gap-1">
                {['فحص عشوائي تم احتواؤه', 'تم حظر الـ IP', 'مصدر موثوق ومعتمد'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNotes(preset)}
                    className="rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-1.5 py-0.5 text-[10px] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-blue-500"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
              }}
              placeholder="مثال: تم حظر عنوان IP على مستوى جدار الحماية، وتبين أن المحاولة مجرد فحص عشوائي..."
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5 text-xs text-[var(--app-text)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isResolving}
              className="px-3 py-1.5 text-xs"
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void onConfirm(notes.trim());
              }}
              disabled={isResolving}
              className="px-4 py-1.5 text-xs font-bold"
            >
              {isResolving ? 'جاري المعالجة...' : 'تأكيد المعالجة'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
