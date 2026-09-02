import React, { useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../core/utils';
import EmptyState from '../base/EmptyState';
import type { Column } from './ExcelTable';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ExcelTableBodyProps<T> {
  isLoading: boolean;
  orderedData: T[];
  columns: Array<Column<T>>;
  enableSelection: boolean;
  emptyMessage: string | undefined;
  selectedRowIds: Set<string>;
  selection: any; // Using any for selection state type from useTableKeyboardNavigation
  getRowId?: ((row: T) => string) | undefined;
  handleDragStart: (e: React.DragEvent<HTMLTableRowElement>, idx: number) => void;
  handleDragEnter: (e: React.DragEvent<HTMLTableRowElement>, idx: number) => void;
  handleDragOver?: (e: React.DragEvent<HTMLTableRowElement>, idx: number) => void;
  handleDragEnd: (e: React.DragEvent<HTMLTableRowElement>) => void;
  handleDrop: () => void;
  onRowClick?: ((row: T) => void) | undefined;
  onOrderChange?: ((data: T[]) => void) | undefined;
  currentTheme: { hover: string; glow: string };
  toggleRowSelection: (id: string, e: React.MouseEvent) => void;
  currentPage: number;
  itemsPerPage: number;
  focusedCell: { row: number; col: number } | null;
  editingCell: { row: number; col: number } | null;
  handleCellClick: (row: number, col: number, shiftKey: boolean) => void;
  handleMouseDownCell: (e: React.MouseEvent, row: number, col: number) => void;
  handleMouseEnterCell: () => void;
  onRowDoubleClick?: ((row: T) => void) | undefined;
  startEditing: (row: number, col: number) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  saveEdit: () => void;
  handleEditInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isRTL: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  rowHeight?: number;
}

export function ExcelTableBody<T>({
  isLoading,
  orderedData,
  columns,
  enableSelection,
  emptyMessage,
  selectedRowIds,
  selection,
  getRowId,
  handleDragStart,
  handleDragEnter,
  handleDragOver,
  handleDragEnd,
  handleDrop,
  onRowClick,
  onOrderChange,
  currentTheme,
  toggleRowSelection,
  currentPage,
  itemsPerPage,
  focusedCell,
  editingCell,
  handleCellClick,
  handleMouseDownCell,
  handleMouseEnterCell,
  onRowDoubleClick,
  startEditing,
  editValue,
  setEditValue,
  saveEdit,
  handleEditInputKeyDown,
  isRTL,
  scrollRef,
  rowHeight = 36, // default estimated row height
}: ExcelTableBodyProps<T>) {
  const rowVirtualizer = useVirtualizer({
    count: isLoading ? 0 : orderedData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  // Auto-scroll when keyboard navigation changes focused row
  useEffect(() => {
    if (focusedCell && focusedCell.row >= 0 && rowVirtualizer) {
      rowVirtualizer.scrollToIndex(focusedCell.row, { align: 'auto' });
    }
  }, [focusedCell?.row, rowVirtualizer]);

  if (isLoading) {
    return (
      <tbody>
        {Array.from({ length: 5 }).map((_, i) => (
          <tr
            key={`skeleton-${i}`}
            className="animate-pulse border-b border-[var(--app-border)] bg-[var(--app-surface)]"
          >
            {enableSelection && (
              <td className="border-r border-[var(--app-border)] p-3">
                <div className="mx-auto h-4 w-4 rounded bg-[var(--app-bg)]" />
              </td>
            )}
            <td className="border-r border-[var(--app-border)] p-3">
              <div className="mx-auto h-4 w-6 rounded bg-[var(--app-bg)]" />
            </td>
            {columns.map((_, j) => (
              <td key={`skeleton-cell-${j}`} className="border-r border-[var(--app-border)] p-3">
                <div className="h-4 w-full rounded bg-[var(--app-bg)]" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    );
  }

  if (orderedData.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length + (enableSelection ? 2 : 1)}>
            <EmptyState
              title="لا توجد بيانات"
              description={emptyMessage || 'لم يتم العثور على سجلات مطابقة.'}
            />
          </td>
        </tr>
      </tbody>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualItems?.[virtualItems.length - 1]?.end || 0)
      : 0;

  return (
    <tbody>
      {paddingTop > 0 && (
        <tr>
          <td
            style={{ height: `${paddingTop}px` }}
            colSpan={columns.length + (enableSelection ? 2 : 1)}
          />
        </tr>
      )}

      {virtualItems.map(virtualRow => {
        const rowIdx = virtualRow.index;
        const row = orderedData[rowIdx];
        const rowId = getRowId
          ? getRowId(row)
          : ((row as Record<string, unknown>)?.id as string) || String(rowIdx);
        const isSelected = selectedRowIds.has(rowId);

        const isInSelection = selection
          ? rowIdx >= Math.min(selection.start.row, selection.end.row) &&
            rowIdx <= Math.max(selection.start.row, selection.end.row)
          : false;

        return (
          <tr
            key={rowId}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            draggable={!!onOrderChange}
            onDragStart={e => {
              handleDragStart(e, rowIdx);
            }}
            onDragEnter={e => {
              handleDragEnter(e, rowIdx);
            }}
            onDragOver={e => {
              if (handleDragOver) {
                handleDragOver(e, rowIdx);
              } else {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'group select-none border-b border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] transition-colors',
              onRowClick ? 'cursor-pointer' : '',
              !!onOrderChange && 'cursor-grab active:cursor-grabbing',
              currentTheme.hover,
              isSelected ? 'bg-blue-50/80 dark:bg-blue-900/40' : '',
              isInSelection ? 'bg-blue-30/30 dark:bg-blue-900/20' : ''
            )}
          >
            {enableSelection && (
              <td className="h-full min-h-[36px] border-r border-[var(--app-border)] p-2 text-center">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={isSelected}
                    onChange={() => {}}
                    onClick={e => {
                      toggleRowSelection(rowId, e);
                    }}
                  />
                </div>
              </td>
            )}
            <td
              className={cn(
                'bg-[var(--app-bg)]/50 select-none border-r border-[var(--app-border)] p-2 text-center font-mono text-[11px] text-[var(--app-text-secondary)]',
                focusedCell?.row === rowIdx ? currentTheme.glow : ''
              )}
            >
              {onOrderChange ? (
                <div className="flex items-center justify-center gap-1">
                  <GripVertical
                    size={12}
                    className="text-gray-400 opacity-60 transition-opacity group-hover:opacity-100"
                  />
                  <span>{(currentPage - 1) * itemsPerPage + rowIdx + 1}</span>
                </div>
              ) : (
                (currentPage - 1) * itemsPerPage + rowIdx + 1
              )}
            </td>
            {columns.map((col, colIdx) => {
              const isFocused = focusedCell?.row === rowIdx && focusedCell?.col === colIdx;
              const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;

              const isCellInSelection = selection
                ? rowIdx >= Math.min(selection.start.row, selection.end.row) &&
                  rowIdx <= Math.max(selection.start.row, selection.end.row) &&
                  colIdx >= Math.min(selection.start.col, selection.end.col) &&
                  colIdx <= Math.max(selection.start.col, selection.end.col)
                : false;

              return (
                <td
                  key={colIdx}
                  data-row-index={rowIdx}
                  data-col-index={colIdx}
                  onClick={e => {
                    e.stopPropagation();
                    onRowClick?.(row);
                    handleCellClick(rowIdx, colIdx, e.shiftKey);
                  }}
                  onMouseDown={e => {
                    handleMouseDownCell(e, rowIdx, colIdx);
                  }}
                  onMouseEnter={() => {
                    handleMouseEnterCell();
                  }}
                  onDoubleClick={() => {
                    onRowDoubleClick?.(row);
                    if (col.isEditable) startEditing(rowIdx, colIdx);
                  }}
                  className={cn(
                    'relative cursor-cell border-r border-gray-300 p-0 text-[12px] font-medium transition-all dark:border-slate-700/50',
                    isFocused && !isEditing
                      ? cn(
                          'z-10 outline outline-2 -outline-offset-2 outline-blue-600 dark:outline-blue-400',
                          currentTheme.glow,
                          'bg-blue-50/50 dark:bg-blue-900/30'
                        )
                      : '',
                    isCellInSelection && !isFocused ? 'bg-blue-50/20 dark:bg-blue-900/10' : '',
                    isRTL ? '[&>*:first-child]:text-left [&>*:first-child]:rtl:text-right' : '',
                    col.align === 'center' ? 'text-center' : '',
                    col.align === 'right' ? 'text-right' : '',
                    col.align === 'left' ? 'text-left' : '',
                    col.className || ''
                  )}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValue}
                      autoFocus
                      onChange={e => {
                        setEditValue(e.target.value);
                      }}
                      onBlur={saveEdit}
                      onKeyDown={handleEditInputKeyDown}
                      className={cn(
                        'h-full min-h-[36px] w-full border-2 border-blue-600 bg-blue-100/80 p-2 font-semibold text-[var(--app-text)] outline-none dark:border-blue-400 dark:bg-blue-900/50',
                        currentTheme.glow,
                        col.className
                      )}
                    />
                  ) : (
                    <div className="h-full min-h-[36px] w-full p-2">{col.accessor(row)}</div>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}

      {paddingBottom > 0 && (
        <tr>
          <td
            style={{ height: `${paddingBottom}px` }}
            colSpan={columns.length + (enableSelection ? 2 : 1)}
          />
        </tr>
      )}
    </tbody>
  );
}
