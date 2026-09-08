import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
  fiscalYear: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  isLoading: boolean;
}

const FiscalYearClosingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  fiscalYear,
  isLoading,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!fiscalYear) return null;

  const handleClose = () => {
    if (isLoading) return;
    setAcknowledged(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`معالج إقفال السنة المالية: ${fiscalYear.name}`}
      size="md"
    >
      <div className="space-y-4 p-1">
        {/* Warning Callout */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={20} />
          <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
            <h4 className="font-bold">تنبيه سيادي فائق الأهمية</h4>
            <p className="leading-relaxed">
              عملية إقفال السنة المالية هي إجراء محاسبي نهائي لا يمكن التراجع عنه. يتم قفل الفترة
              لمنع أي تعديل أو إضافة لقيود لاحقة، وتوليد قيود تسوية مركزية ترحل لدفتر الأستاذ العام.
            </p>
          </div>
        </div>

        {/* Automated Steps Card */}
        <div className="space-y-2 rounded-xl border border-gray-200 bg-[var(--app-surface)] p-3 text-xs dark:border-slate-800">
          <h4 className="font-bold text-[var(--app-text)]">الخطوات التي سينفذها النظام آلياً:</h4>
          <ul className="space-y-2 text-gray-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
              <span>
                احتساب مجاميع الإيرادات والمصروفات للفترة ({fiscalYear.start_date} إلى{' '}
                {fiscalYear.end_date}).
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
              <span>توليد قيد إقفال متوازن يصفر حسابات الإيرادات (4xxx) والمصروفات (5xxx).</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
              <span>ترحيل صافي الأرباح أو الخسائر إلى حساب الأرباح المبقاة (3200).</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
              <span>تأسيس السنة المالية التالية وتدوير الأرصدة الافتتاحية للمركز المالي.</span>
            </li>
          </ul>
        </div>

        {/* Checkbox Acknowledgment */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/30">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
            disabled={isLoading}
            className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="font-bold text-gray-700 dark:text-slate-300">
            أقر بصفتي مالك المنشأة بصحة كافة الفواتير والسندات وأطلب إتمام الإقفال وتوليد القيود
            فورياً.
          </span>
        </label>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button
            variant="danger"
            disabled={!acknowledged || isLoading}
            isLoading={isLoading}
            onClick={() => onConfirm(fiscalYear.id)}
            leftIcon={<Lock size={14} />}
          >
            تأكيد الإقفال السنوي
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FiscalYearClosingModal;
