import React from 'react';

interface AdminPageHeaderProps {
  /** العنوان العربي الرئيسي للتبويب (بدون إنجليزية عشوائية). */
  title: string;
  /** وصف ثانوي قصير. */
  subtitle: string;
  /** إجراءات (أزرار) تُحاذى يسار الترويسة (يمين في RTL). اختياري. */
  actions?: React.ReactNode | undefined;
}

/**
 * ترويسة تبويب موحّدة في مركز التحكم — تُغني عن تكرار نفس الشكل في كل تبويب
 * وتضمن ثبات التصميم (عربي + وصف ثانوي + أزرار الإجراءات).
 */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <h2 className="text-xs font-black text-[var(--app-text)]">{title}</h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--app-text-secondary)]">
        {subtitle}
      </p>
    </div>
    {actions && (
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">{actions}</div>
    )}
  </div>
);
