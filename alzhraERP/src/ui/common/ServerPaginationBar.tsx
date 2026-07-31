/**
 * ServerPaginationBar
 * ===================
 * A premium, RTL-ready pagination bar for server-side paginated tables.
 *
 * Features:
 *  - Page number buttons with smart ellipsis (1 … 4 5 6 … 20)
 *  - Items-per-page selector
 *  - "Fetching" spinner overlay when background-loading
 *  - Total record count badge
 *  - Fully typed, zero `any`
 */

import React, { useMemo } from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Loader2 } from 'lucide-react';
import { cn } from '../../core/utils';

interface ServerPaginationBarProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  isRTL?: boolean;
  className?: string;
}

/** Build the list of page items with ellipsis */
function buildPageItems(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (page > 4) pages.push('...');

  const start = Math.max(2, page - 2);
  const end = Math.min(totalPages - 1, page + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  if (page < totalPages - 3) pages.push('...');

  pages.push(totalPages);
  return pages;
}

const ServerPaginationBar: React.FC<ServerPaginationBarProps> = ({
  page,
  totalPages,
  totalCount,
  pageSize,
  isFetching = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  isRTL = true,
  className,
}) => {
  const pageItems = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  if (totalPages <= 1 && totalCount <= pageSize) return null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-4 py-2.5',
        'bg-white dark:bg-slate-900 border-t border-[var(--app-border)]',
        'text-xs font-bold select-none',
        className
      )}
    >
      {/* Left: Record count */}
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 shrink-0">
        {isFetching && (
          <Loader2 size={13} className="animate-spin text-blue-500" />
        )}
        <span className="hidden sm:inline">
          عرض{' '}
          <span className="text-gray-800 dark:text-slate-200 font-black">{from.toLocaleString('en-US')}–{to.toLocaleString('en-US')}</span>
          {' '}من{' '}
          <span className="text-blue-600 dark:text-blue-400 font-black">{totalCount.toLocaleString('en-US')}</span>
          {' '}سجل
        </span>
        <span className="sm:hidden text-blue-600 dark:text-blue-400 font-black">
          {totalCount.toLocaleString('en-US')}
        </span>
      </div>

      {/* Center: Page buttons */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <PagBtn
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          title="الصفحة الأولى"
        >
          <ChevronsRight size={14} />
        </PagBtn>

        {/* Prev page */}
        <PagBtn
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          title="الصفحة السابقة"
        >
          <ChevronRight size={14} />
        </PagBtn>

        {/* Page numbers */}
        {pageItems.map((item, idx) =>
          item === '...' ? (
            <span key={`ellipsis-${idx}`} className="w-8 text-center text-gray-400">…</span>
          ) : (
            <PagBtn
              key={item}
              onClick={() => onPageChange(item)}
              active={item === page}
              title={`الصفحة ${item}`}
            >
              {item}
            </PagBtn>
          )
        )}

        {/* Next page */}
        <PagBtn
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          title="الصفحة التالية"
        >
          <ChevronLeft size={14} />
        </PagBtn>

        {/* Last page */}
        <PagBtn
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          title="الصفحة الأخيرة"
        >
          <ChevronsLeft size={14} />
        </PagBtn>
      </div>

      {/* Right: Page size selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-gray-400 hidden sm:inline">صفوف/صفحة</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className={cn(
              'h-7 px-2 text-xs font-black rounded-lg border',
              'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
              'text-gray-700 dark:text-slate-300 outline-none',
              'focus:border-blue-500 cursor-pointer',
            )}
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

// ── Sub-component: Page Button ────────────────────────────────────────────────

interface PagBtnProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}

const PagBtn: React.FC<PagBtnProps> = ({ onClick, disabled, active, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-black transition-all duration-150',
      'flex items-center justify-center',
      active
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800',
      disabled && 'opacity-30 cursor-not-allowed pointer-events-none',
    )}
  >
    {children}
  </button>
);

export default ServerPaginationBar;
