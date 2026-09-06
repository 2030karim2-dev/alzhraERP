import React, { useState, useRef } from 'react';
import { Coffee, Check, Loader2 } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { useAuthStore } from '../../auth/store';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import { useRecordQuickDrawerExpense } from '../hooks/useDailyReconciliation';

interface QuickDrawerExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
}

const PRESET_DESCRIPTIONS = [
  'شاي وضيافة',
  'نظافة ومستهلكات',
  'مشوار وتوصيل سريع',
  'صيانة خفيفة للمحل',
  'مستلزمات مكتبية',
  'فطور عمال',
];

export const QuickDrawerExpenseModal: React.FC<QuickDrawerExpenseModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();
  const { mutate: recordExpense, isPending } = useRecordQuickDrawerExpense();
  const isSubmittingRef = useRef(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isPending) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (!description.trim()) return;
    if (!user?.company_id) return;

    isSubmittingRef.current = true;

    recordExpense(
      {
        company_id: user.company_id,
        amount: numAmount,
        description: description.trim(),
        branch_id: branchId,
        expense_date: selectedDate,
      },
      {
        onSuccess: () => {
          setAmount('');
          setDescription('');
          onClose();
        },
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل مصروف نثري من الدرج (سريع)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          <Coffee className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            أي مبلغ يخرج من درج الكاشير سجله هنا فوراً، وسيُخصم تلقائياً من النقدية المطلوبة بنهاية
            اليوم.
          </span>
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
            المبلغ المصروف (ر.س) *
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0.5"
              required
              autoFocus
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="مثال: 35"
              className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-lg font-black text-[var(--app-text)] focus:border-amber-500 focus:outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--app-text-secondary)]">
              ر.س
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--app-text-secondary)]">
            اختر بياناً سريعاً:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_DESCRIPTIONS.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setDescription(preset)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  description === preset
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'border border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text)] hover:bg-[var(--app-hover)]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Description */}
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
            البيان / السبب *
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="مثال: شاي وضيافة، أو فاتورة مياه"
            className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-xs text-[var(--app-text)] focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || !amount || !description.trim()}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                خصم من الدرج الآن
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
