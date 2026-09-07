import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../../../core/utils';
import type { ReactNode } from 'react';
import { AdminPagination, type AdminPaginationProps } from './AdminPagination';
import { AdminSearchBox } from './AdminSearchBox';

export interface AdminColumn {
  label: string;
  /** محاذاة محتوى العمود (يمين افتراضياً في RTL). */
  align?: 'center' | 'left';
}

interface AdminTableShellProps {
  /** تعريف الأعمدة — يُولَّد منها <thead> ويُشتق عدد الأعمدة لصفوف الحالة. */
  columns: AdminColumn[];
  /** صفوف <tbody> تُمرَّر وحيدة (عند وجود بيانات). */
  children: ReactNode;
  /** هل توجد بيانات لعرضها؟ (يحدد عرض رسالة "لا توجد بيانات"). */
  hasRows: boolean;
  loading?: boolean;
  error?: boolean;
  /** رسالة الحالة الفارغة. */
  emptyMessage: string;
  /** رسالة الخطأ (افتراضية جاهزة). */
  errorMessage?: string;
  /** شريط الترقيم الموحّد. */
  pagination: AdminPaginationProps;
  /** — شريط أدوات اختياري (بحث + إجراءات) — يظهر عند تمرير أحدها — */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** أزرار/قوائم إجراءات تظهر يسار شريط الأدوات (تصدير/تحديث/فلاتر). */
  actions?: ReactNode;
}

/**
 * غلاف الجدول الموحّد لمركز التحكم — يجمع شريط الأدوات (بحث اختياري + إجراءات)،
 * هيكل الجدول مع حالات التحميل/الخطأ/الفارغة، وشريط الترقيم. به يُغلّف كل جدول
 * (منشآت/مستخدمون/أمان) داخل مكوّن واحد فيُحسم التكرار الثلاثي لنفس البنية.
 */
export const AdminTableShell: React.FC<AdminTableShellProps> = ({
  columns,
  children,
  hasRows,
  loading = false,
  error = false,
  emptyMessage,
  errorMessage = 'تعذر تحميل البيانات. يرجى التحقق من الاتصال ثم إعادة المحاولة.',
  pagination,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  actions,
}) => {
  const colCount = columns.length > 0 ? columns.length : 1;

  const statusRow: ReactNode = loading ? (
    <tr>
      <td colSpan={colCount} className="py-12 text-center text-xs text-[var(--app-text-secondary)]">
        جاري تحميل البيانات...
      </td>
    </tr>
  ) : error ? (
    <tr>
      <td colSpan={colCount} className="py-12 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500">
          <AlertTriangle size={14} />
          {errorMessage}
        </span>
      </td>
    </tr>
  ) : !hasRows ? (
    <tr>
      <td colSpan={colCount} className="py-12 text-center text-xs text-[var(--app-text-secondary)]">
        {emptyMessage}
      </td>
    </tr>
  ) : (
    children
  );

  const hasToolbar = searchValue !== undefined || actions !== undefined;

  return (
    <div className="space-y-3">
      {/* شريط الأدوات (بحث + إجراءات) */}
      {hasToolbar && (
        <div className="flex flex-col items-center justify-between gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs sm:flex-row">
          {searchValue !== undefined && onSearchChange && (
            <AdminSearchBox
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder || 'بحث...'}
            />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* الجدول */}
      <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[10px] font-black uppercase text-[var(--app-text-secondary)]">
                {columns.map(column => (
                  <th
                    key={column.label}
                    className={cn(
                      'px-3.5 py-2.5',
                      column.align === 'center' && 'text-center',
                      column.align === 'left' && 'text-left'
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">{statusRow}</tbody>
          </table>
        </div>
        {!loading && <AdminPagination {...pagination} />}
      </div>
    </div>
  );
};
