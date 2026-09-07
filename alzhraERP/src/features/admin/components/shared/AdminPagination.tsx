import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../../../ui/base/Button';

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  itemCount: number;
  totalItems: number;
  /** الاسم الجمعي للعناصر المعروضة (مثل: منشأة/مستخدم) لعرض العدد. */
  itemLabel: string;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * شريط الترقيم الموحّد لمركز التحكم — يُستبدل به التكرار الحرفي لنفس الشريط في
 * جداول المنشآت/المستخدمين/الأمان. الالتزام بمعايير التصميم: أزرار التفاعل ≥12px
 * (الحجم للـ text-[10px] يقتصر على سطر الإحصاء التوضيحي فقط).
 */
export const AdminPagination: React.FC<AdminPaginationProps> = ({
  page,
  totalPages,
  itemCount,
  totalItems,
  itemLabel,
  isLoading,
  onPrev,
  onNext,
}) => {
  const canPrev = page > 1 && !isLoading;
  const canNext = page < totalPages && !isLoading;

  return (
    <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3.5 py-2">
      <span className="text-[10px] text-[var(--app-text-secondary)]">
        عرض {itemCount} من {totalItems} {itemLabel} (صفحة {page} من {totalPages})
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          disabled={!canPrev}
          onClick={onPrev}
          className="flex items-center gap-1 px-2.5 py-1 text-xs"
        >
          <ChevronRight size={12} aria-hidden="true" />
          <span>السابق</span>
        </Button>
        <span className="px-2 text-xs font-bold text-[var(--app-text)]">{page}</span>
        <Button
          variant="outline"
          disabled={!canNext}
          onClick={onNext}
          className="flex items-center gap-1 px-2.5 py-1 text-xs"
        >
          <span>التالي</span>
          <ChevronLeft size={12} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
