import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../core/utils';
import type { Column } from './ExcelTable';

interface ExcelTableHeaderProps<T> {
  columns: Array<Column<T>>;
  enableSelection: boolean;
  orderedDataLength: number;
  selectedRowIdsSize: number;
  toggleAllSelection: () => void;
  columnWidths: Record<string, number>;
  handleSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  isRTL: boolean;
  handleMouseDown: (e: React.MouseEvent, colIndex: number) => void;
  isLoading: boolean;
}

export function ExcelTableHeader<T>({
  columns,
  enableSelection,
  orderedDataLength,
  selectedRowIdsSize,
  toggleAllSelection,
  columnWidths,
  handleSort,
  sortConfig,
  isRTL,
  handleMouseDown,
  isLoading,
}: ExcelTableHeaderProps<T>) {
  return (
    <thead className="bg-[var(--app-bg)]/95 sticky top-0 z-[12] shadow-sm backdrop-blur-sm">
      <tr className="border-b border-[var(--app-border)] text-[var(--app-text)]">
        {enableSelection && (
          <th className="relative w-10 border-r border-[var(--app-border)] p-2 text-center">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              checked={orderedDataLength > 0 && selectedRowIdsSize === orderedDataLength}
              onChange={toggleAllSelection}
              disabled={isLoading || orderedDataLength === 0}
            />
          </th>
        )}
        <th
          className="relative w-10 border-r border-[var(--app-border)] p-2 text-[10px] font-semibold text-[var(--app-text-secondary)]"
          scope="col"
        >
          #
        </th>
        {columns.map((col, idx) => (
          <th
            key={idx}
            scope="col"
            aria-sort={
              sortConfig?.key === (col.sortKey as string)
                ? sortConfig?.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
            style={{ width: columnWidths[idx] ? `${columnWidths[idx]}px` : col.width }}
            onClick={() => !isLoading && col.sortKey && handleSort(col.sortKey as string)}
            className={cn(
              'relative border-r border-gray-300 p-2 dark:border-slate-700/50',
              !isLoading && col.sortKey
                ? 'cursor-pointer select-none hover:bg-[var(--app-surface-hover)]'
                : ''
            )}
          >
            <div
              className={cn(
                'flex items-center gap-1',
                col.align === 'center' || !col.align ? 'justify-center text-center' : '',
                col.align === 'right' ? 'justify-end text-right' : '',
                col.align === 'left' ? 'justify-start text-left' : '',
                isRTL ? 'flex-row-reverse' : ''
              )}
            >
              <span>{col.header}</span>
              {col.sortKey && (
                <div className="flex flex-col">
                  <ChevronUp
                    size={8}
                    className={cn(
                      'text-gray-400',
                      sortConfig?.key === col.sortKey && sortConfig?.direction === 'asc'
                        ? 'text-blue-600'
                        : 'opacity-30'
                    )}
                  />
                  <ChevronDown
                    size={8}
                    className={cn(
                      'text-gray-400',
                      sortConfig?.key === col.sortKey && sortConfig?.direction === 'desc'
                        ? 'text-blue-600'
                        : 'opacity-30'
                    )}
                  />
                </div>
              )}
            </div>
            {/* Column Resize Handle */}
            <div
              onMouseDown={e => {
                handleMouseDown(e, idx);
              }}
              onClick={e => {
                e.stopPropagation();
              }}
              className="absolute top-0 z-[13] h-full w-1.5 cursor-col-resize transition-colors hover:bg-blue-400/60 active:bg-blue-500"
              style={isRTL ? { left: -1 } : { right: -1 }}
            />
          </th>
        ))}
      </tr>
    </thead>
  );
}
