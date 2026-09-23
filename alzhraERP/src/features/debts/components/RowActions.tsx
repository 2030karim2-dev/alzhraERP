/**
 * RowActions — مجموعة أزرار إجراءات الصف الموحّدة لوحدة الديون.
 *
 * كل إجراء يوفّر أيقونته ولونه؛ وأي إجراء يحمل `confirm` يُنفَّذ عبر
 * ConfirmModal (بديل window.confirm الموحّد في النظام) قبل التنفيذ.
 * مصدر واحد للأزرار يخدم جدول سطح المكتب وبطاقات الموبايل معاً.
 */
import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../core/utils';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';

export interface RowActionConfirm {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'info' | 'warning' | 'primary';
}

export interface RowAction {
  key: string;
  icon: LucideIcon;
  label: string;
  /** فئات اللون من Tailwind (خلفية/نص/hover) الخاصة بالإجراء. */
  colorClasses: string;
  disabled?: boolean;
  /** عند وجودها يُطلب تأكيد المستخدم قبل التنفيذ. */
  confirm?: RowActionConfirm;
  onAction: () => void;
}

interface RowActionsProps {
  actions: RowAction[];
  /** table: أزرار الجدول (p-2 وأيقونة 14) — card: بطاقات الموبايل (p-2.5 وأيقونة 16). */
  variant?: 'table' | 'card';
  className?: string;
}

const variantClasses = (variant: 'table' | 'card'): string =>
  variant === 'card' ? 'p-2.5 active:scale-90' : 'p-2 max-md:p-1.5';

interface ConfirmHostProps {
  pending: RowAction | null;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * نافذة تأكيد واحدة لكل مجموعة إجراءات.
 * تُطبَّع القيم افتراضياً (تأكيد/danger) لتفادي تمرير `undefined` صراحةً إلى
 * ConfirmModal تحت exactOptionalPropertyTypes.
 */
const ConfirmHost: React.FC<ConfirmHostProps> = ({ pending, onClose, onConfirm }) => {
  const confirm = pending !== null ? pending.confirm : undefined;
  return (
    <ConfirmModal
      isOpen={confirm !== undefined}
      onClose={onClose}
      onConfirm={onConfirm}
      title={confirm?.title ?? 'تأكيد الإجراء'}
      message={confirm?.message ?? ''}
      confirmLabel={confirm?.confirmLabel ?? 'تأكيد'}
      variant={confirm?.variant ?? 'danger'}
    />
  );
};

interface ActionButtonProps {
  action: RowAction;
  variant: 'table' | 'card';
  onTrigger: (action: RowAction) => void;
}

/** زر إجراء واحد (أيقونة فقط مع تلميح وصفّ للوصولية). */
const ActionButton: React.FC<ActionButtonProps> = ({ action, variant, onTrigger }) => {
  const Icon = action.icon;
  return (
    <button
      type="button"
      title={action.label}
      aria-label={action.label}
      disabled={action.disabled}
      onClick={() => {
        onTrigger(action);
      }}
      className={cn(
        'rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses(variant),
        action.colorClasses
      )}
    >
      <Icon size={variant === 'card' ? 16 : 14} />
    </button>
  );
};

export const RowActions: React.FC<RowActionsProps> = ({
  actions,
  variant = 'table',
  className,
}) => {
  const [pending, setPending] = useState<RowAction | null>(null);

  const handleTrigger = (action: RowAction): void => {
    if (action.confirm !== undefined) {
      setPending(action);
      return;
    }
    action.onAction();
  };

  const handleConfirm = (): void => {
    const action = pending;
    setPending(null);
    if (action !== null) action.onAction();
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {actions.map(action => (
        <ActionButton
          key={action.key}
          action={action}
          variant={variant}
          onTrigger={handleTrigger}
        />
      ))}

      <ConfirmHost
        pending={pending}
        onClose={() => {
          setPending(null);
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default RowActions;
