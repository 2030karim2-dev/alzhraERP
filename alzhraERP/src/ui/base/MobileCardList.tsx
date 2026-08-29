import React from 'react';
import { cn } from '../../core/utils';

/**
 * MobileCardList — حاوية موحّدة لبدائل جداول الموبايل.
 *
 * الاستخدام الأساسي: يظهر الجدول على الشاشات ≥md (`hidden md:block`)،
 * وهذا المكوّن يعرض نسخة بطاقات على الشاشات <md فقط (`md:hidden`).
 *
 * يوفر صفاً جاهزاً (MobileCardRow) بهيكل موحّد: ترويسة (عنوان+شارة)،
 * وسطر وصف، وقسم إجراءات اختياري — لتقليل تكرار أنماط البطاقات عبر الميزات.
 */
export interface MobileCardRowProps {
  /** مفتاح React الفريد */
  id?: string;
  /** العنوان الأساسي (اسم العميل/المستند...) */
  title: React.ReactNode;
  /** وصف ثانوي صغير تحت العنوان (هاتف، تاريخ، رقم مرجعي...) */
  subtitle?: React.ReactNode;
  /** شارة الحالة في الزاوية (StatusBadge أو span ملوّن) */
  badge?: React.ReactNode;
  /** شارة إضافية تحت badge (مثل القناة/التصنيف) */
  badgeSecondary?: React.ReactNode;
  /** صف معلومات متوسط (مبالغ، أيام تأخير، أكواد...) */
  meta?: React.ReactNode;
  /** محتوى إضافي أسفل meta (ملاحظات، نص مرتجع...) */
  body?: React.ReactNode;
  /** شريط الإجراءات السفلي (أزرار) */
  actions?: React.ReactNode;
  className?: string;
}

export const MobileCardRow: React.FC<MobileCardRowProps> = ({
  id,
  title,
  subtitle,
  badge,
  badgeSecondary,
  meta,
  body,
  actions,
  className,
}) => {
  return (
    <div
      key={id}
      className={cn(
        'bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] shadow-sm p-3 space-y-2.5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--app-text)] truncate">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-[var(--app-text-secondary)] font-mono" dir="ltr">
              {subtitle}
            </p>
          )}
        </div>
        {(badge || badgeSecondary) && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            {badge}
            {badgeSecondary}
          </div>
        )}
      </div>

      {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--app-text-secondary)]">{meta}</div>}

      {body && <div className="text-[11px] text-[var(--app-text-secondary)] leading-relaxed">{body}</div>}

      {actions && (
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[var(--app-border)]">
          {actions}
        </div>
      )}
    </div>
  );
};

export interface MobileCardListProps {
  /** عناصر البطاقات (عادةً MobileCardRow) */
  children: React.ReactNode;
  /** صفوف/بيانات فارغة؟ */
  isEmpty?: boolean;
  /** رسالة الحالة الفارغة */
  emptyMessage?: string;
  /** يظهر فقط <md (إخفاء عند md+) */
  className?: string;
}

const MobileCardList: React.FC<MobileCardListProps> = ({
  children,
  isEmpty,
  emptyMessage = 'لا توجد بيانات',
  className,
}) => {
  if (isEmpty) {
    return (
      <div className={cn('md:hidden', className)}>
        <div className="p-6 text-center text-sm text-[var(--app-text-secondary)] border-2 border-dashed border-[var(--app-border)] rounded-2xl">
          {emptyMessage}
        </div>
      </div>
    );
  }
  return <div className={cn('md:hidden space-y-2.5', className)}>{children}</div>;
};

export default MobileCardList;