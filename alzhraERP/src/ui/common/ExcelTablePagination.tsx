import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../core/utils';

interface ExcelTablePaginationProps {
  enablePagination: boolean;
  totalPages: number;
  processedDataLength: number;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  isRTL: boolean;
  currentTheme: { accent: string };
}

export function ExcelTablePagination({
  enablePagination,
  totalPages,
  processedDataLength,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  isRTL,
  currentTheme,
}: ExcelTablePaginationProps) {
  if (!enablePagination || totalPages <= 1) return null;

  return (
    <div className="flex select-none flex-col items-center justify-between gap-2 border-t border-[var(--app-border)] bg-[var(--app-bg)] p-2 sm:flex-row">
      <div className="flex items-center gap-2 text-[10px] text-[var(--app-text-secondary)]">
        <span>عرض</span>
        <select
          value={itemsPerPage}
          onChange={e => {
            setItemsPerPage(Number(e.target.value));
          }}
          className="rounded border-[var(--app-border)] bg-[var(--app-surface)] p-1 text-[10px] text-[var(--app-text)] outline-none focus:border-blue-500"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
          <option value={1000000}>الكل</option>
        </select>
        <span>سجل من أصل {processedDataLength}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            setCurrentPage(p => Math.max(1, p - 1));
          }}
          disabled={currentPage === 1}
          className={cn(
            'flex items-center gap-1 rounded p-1 px-3 text-[10px] font-bold text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface)] disabled:opacity-50 disabled:hover:bg-transparent',
            isRTL ? 'flex-row-reverse' : ''
          )}
        >
          {isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          <span>السابق</span>
        </button>

        <div className="mx-2 flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => {
                  setCurrentPage(pageNum);
                }}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold transition-all',
                  currentPage === pageNum
                    ? cn('text-white shadow-md', currentTheme.accent)
                    : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)]'
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setCurrentPage(p => Math.min(totalPages, p + 1));
          }}
          disabled={currentPage === totalPages}
          className={cn(
            'flex items-center gap-1 rounded p-1 px-3 text-[10px] font-bold text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface)] disabled:opacity-50 disabled:hover:bg-transparent',
            isRTL ? 'flex-row-reverse' : ''
          )}
        >
          <span>التالي</span>
          {isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </div>
  );
}
