import React, { useState } from 'react';
import { Coins, HelpCircle, ArrowRightLeft } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import { formatLocalDate } from '../../../../core/utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  account: {
    id: string;
    name: string;
    code: string;
    currency_code: string;
    balance?: number;
  } | null;
  onSubmit: (params: {
    accountId: string;
    closingRate: number;
    operator: 'multiply' | 'divide';
    periodDate: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

const FxRevaluationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  account,
  onSubmit,
  isSubmitting,
}) => {
  const [rate, setRate] = useState<string>('');
  const [operator, setOperator] = useState<'multiply' | 'divide'>('multiply');
  const [periodDate, setPeriodDate] = useState<string>(formatLocalDate(new Date()));

  if (!account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numRate = Number.parseFloat(rate);
    if (!numRate || numRate <= 0) return;

    await onSubmit({
      accountId: account.id,
      closingRate: numRate,
      operator,
      periodDate,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إعادة تقييم فروق العملة: ${account.name} (${account.currency_code})`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
          <div className="flex items-start gap-2.5">
            <HelpCircle size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <p className="leading-relaxed">
              تُستخدم إعادة التقييم الدورية (نهاية الشهر) لتعديل القيمة الدفترية لرصيد الصندوق
              الأجنبي بالريال السعودي وفقاً لسعر الصرف الفعلي الحالي، مع إثبات الفارق تلقائياً في
              حساب <strong>أرباح تقييم العملة (4400)</strong> أو{' '}
              <strong>خسائر تقييم العملة (5800)</strong> دون المساس بعدد وحدات العملة الأجنبية.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              سعر الصرف الإقفالي الجديد ({account.currency_code} مقابل SAR)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.000001"
                min="0.000001"
                required
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="مثال: 0.0025 أو 400"
                className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 font-mono text-sm text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
              />
              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-xs text-gray-400">
                {account.currency_code}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              طريقة احتساب المعادل الأساسي
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOperator('multiply')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition ${
                  operator === 'multiply'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-slate-200 bg-[var(--app-surface)] text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                <ArrowRightLeft size={14} />
                <span>ضرب (المبلغ × السعر)</span>
              </button>
              <button
                type="button"
                onClick={() => setOperator('divide')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition ${
                  operator === 'divide'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-slate-200 bg-[var(--app-surface)] text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                <ArrowRightLeft size={14} />
                <span>قسمة (المبلغ ÷ السعر)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              تاريخ قيد إعادة التقييم
            </label>
            <input
              type="date"
              required
              value={periodDate}
              onChange={e => setPeriodDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 font-mono text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!rate || Number.parseFloat(rate) <= 0 || isSubmitting}
            isLoading={isSubmitting}
            leftIcon={<Coins size={14} />}
          >
            توليد قيد التقييم الآلي
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FxRevaluationModal;
