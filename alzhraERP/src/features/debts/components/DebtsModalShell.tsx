/**
 * DebtsModalShell — الهيكل الموحد للمودالات الأربعة في وحدة الديون
 * (AIDebtRiskModal / ReminderModal / PromiseFormModal / CollectionTimelineModal).
 *
 * يستبدل الأغلفة اليدوية المتكررة (overlay + panel + header + body + footer)
 * بمكوّن واحد عبر Prop Slots — دون تغيير سلوك الإغلاق (لا backdrop-close ولا
 * Escape، مطابقاً للسلوك الحالي للمودالات الأربعة).
 */
import React, { useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../core/utils';

export interface DebtsModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** أيقونة الترويسة (اختياري — يُغلفها صندوق ملوّن عبر iconClassName). */
  icon?: React.ReactNode;
  iconClassName?: string;
  title: React.ReactNode;
  /** سطر وصف صغير تحت العنوان (رصيد العميل، اسم الطرف...). */
  description?: React.ReactNode;
  /** محتوى إضافي أسفل العنوان (شارة التصعيد في خط التحصيل). */
  titleExtra?: React.ReactNode;
  /** شريط بين الترويسة والمتن (تبويبات النبرة/القوالب في التذكير). */
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  /** محاذاة التذييل — الافتراضي justify-between (إغلاق يساراً وإجراءات يميناً). */
  footerClassName?: string;
  /** تجاوز تباعد/حشوة المتن الافتراضي. */
  bodyClassName?: string;
  /** عرض اللوحة الأقصى. */
  size?: 'md' | 'lg' | 'xl' | '2xl';
  /** استدارة اللوحة — 3xl لمودالات التذكير والتحليل (مطابقة للتصميم الحالي). */
  rounded?: 'rounded-2xl' | 'rounded-3xl';
  children: React.ReactNode;
}

/** عرض اللوحة عبر switch صريح (بلا فهرسة كائن بمفتاح متغيّر). */
const shellSizeClass = (size: 'md' | 'lg' | 'xl' | '2xl'): string => {
  switch (size) {
    case 'md':
      return 'max-w-md';
    case 'lg':
      return 'max-w-lg';
    case 'xl':
      return 'max-w-xl';
    default:
      return 'max-w-2xl';
  }
};

interface ShellHeaderProps {
  onClose: () => void;
  icon?: React.ReactNode;
  iconClassName?: string | undefined;
  title: React.ReactNode;
  titleId: string;
  description?: React.ReactNode;
  titleExtra?: React.ReactNode;
}

/** ترويسة المودال: أيقونة + عنوان/وصف + زر إغلاق. */
const ShellHeader: React.FC<ShellHeaderProps> = ({
  onClose,
  icon,
  iconClassName,
  title,
  titleId,
  description,
  titleExtra,
}) => (
  <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
    <div className="flex min-w-0 items-start gap-3">
      {icon !== undefined && (
        <div
          className={cn(
            'shrink-0 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-500 p-2.5 text-white shadow-lg',
            iconClassName
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h3 id={titleId} className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
          {title}
        </h3>
        {description !== undefined && (
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">{description}</p>
        )}
        {titleExtra}
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="إغلاق"
      className="shrink-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      <X size={18} />
    </button>
  </div>
);

/** متن المودال القابل للتمرير (يتجاوز التباعد/الحشوة عبر className). */
const ShellBody: React.FC<{ className?: string | undefined; children: React.ReactNode }> = ({
  className,
  children,
}) => <div className={cn('flex-1 space-y-4 overflow-y-auto p-5', className)}>{children}</div>;

/** تذييل المودال — يُعرض فقط عند تمرير footer (الافتراضي: إغلاق يساراً وإجراءات يميناً). */
const ShellFooter: React.FC<{ className?: string | undefined; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div
    className={cn(
      'flex items-center gap-2 border-t border-gray-100 bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50',
      className ?? 'justify-between'
    )}
  >
    {children}
  </div>
);

/** غلاف موحد: overlay + لوحة + ترويسة + متن قابل للتمرير + شريط/تذييل اختياريين. */
export const DebtsModalShell: React.FC<DebtsModalShellProps> = ({
  isOpen,
  onClose,
  icon,
  iconClassName,
  title,
  description,
  titleExtra,
  toolbar,
  footer,
  footerClassName,
  bodyClassName,
  size = 'xl',
  rounded = 'rounded-2xl',
  children,
}) => {
  const titleId = useId();
  if (!isOpen) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm duration-200">
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'animate-in zoom-in-95 flex max-h-[90vh] w-full flex-col overflow-hidden border border-gray-100 bg-[var(--app-surface)] shadow-2xl duration-200 dark:border-slate-800',
          shellSizeClass(size),
          rounded
        )}
      >
        <ShellHeader
          onClose={onClose}
          icon={icon}
          iconClassName={iconClassName}
          title={title}
          titleId={titleId}
          description={description}
          titleExtra={titleExtra}
        />

        {toolbar}

        <ShellBody className={bodyClassName}>{children}</ShellBody>

        {footer !== undefined && <ShellFooter className={footerClassName}>{footer}</ShellFooter>}
      </div>
    </div>
  );
};

export default DebtsModalShell;
