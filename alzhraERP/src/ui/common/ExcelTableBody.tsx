import React from 'react';
import { cn } from '../../core/utils';
import EmptyState from '../base/EmptyState';
import { Column } from './ExcelTable';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ExcelTableBodyProps<T> {
    isLoading: boolean;
    orderedData: T[];
    columns: Column<T>[];
    enableSelection: boolean;
    emptyMessage: string | undefined;
    selectedRowIds: Set<string>;
    selection: any; // Using any for selection state type from useTableKeyboardNavigation
    getRowId?: ((row: T) => string) | undefined;
    handleDragStart: (e: React.DragEvent, idx: number) => void;
    handleDragEnter: (e: React.DragEvent, idx: number) => void;
    handleDragEnd: () => void;
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
    onRowDoubleClick?: (row: T) => void;
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
        overscan: 5,
    });

    if (isLoading) {
        return (
            <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse bg-[var(--app-surface)] border-b border-[var(--app-border)]">
                        {enableSelection && <td className="p-3 border-r border-[var(--app-border)]"><div className="w-4 h-4 bg-[var(--app-bg)] rounded mx-auto" /></td>}
                        <td className="p-3 border-r border-[var(--app-border)]"><div className="w-6 h-4 bg-[var(--app-bg)] rounded mx-auto" /></td>
                        {columns.map((_, j) => (
                            <td key={`skeleton-cell-${j}`} className="p-3 border-r border-[var(--app-border)]">
                                <div className="h-4 bg-[var(--app-bg)] rounded w-full" />
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
                        <EmptyState title="لا توجد بيانات" description={emptyMessage || "لم يتم العثور على سجلات مطابقة."} />
                    </td>
                </tr>
            </tbody>
        );
    }

    const virtualItems = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0;
    const paddingBottom = virtualItems.length > 0
        ? rowVirtualizer.getTotalSize() - (virtualItems?.[virtualItems.length - 1]?.end || 0)
        : 0;

    return (
        <tbody>
            {paddingTop > 0 && (
                <tr>
                    <td style={{ height: `${paddingTop}px` }} colSpan={columns.length + (enableSelection ? 2 : 1)} />
                </tr>
            )}

            {virtualItems.map((virtualRow) => {
                const rowIdx = virtualRow.index;
                const row = orderedData[rowIdx];
                const rowId = getRowId ? getRowId(row) : ((row as Record<string, unknown>)?.id as string) || String(rowIdx);
                const isSelected = selectedRowIds.has(rowId);

                const isInSelection = selection ? (
                    rowIdx >= Math.min(selection.start.row, selection.end.row) &&
                    rowIdx <= Math.max(selection.start.row, selection.end.row)
                ) : false;

                return (
                    <tr
                        key={rowId}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        draggable={!!onOrderChange}
                        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, rowIdx)}
                        onDragEnter={(e) => handleDragEnter(e as unknown as React.DragEvent, rowIdx)}
                        onDragEnd={() => handleDragEnd()}
                        onDrop={() => handleDrop()}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => onRowClick && onRowClick(row)}
                        className={cn(
                            "transition-colors group border-b border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)]",
                            onRowClick ? "cursor-pointer" : "",
                            !!onOrderChange && "cursor-grab",
                            currentTheme.hover,
                            isSelected ? "bg-blue-50/80 dark:bg-blue-900/40" : "",
                            isInSelection ? "bg-blue-30/30 dark:bg-blue-900/20" : ""
                        )}
                    >
                        {enableSelection && (
                            <td className="p-2 text-center border-r border-[var(--app-border)] h-full min-h-[36px]">
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        checked={isSelected}
                                        onChange={() => { }}
                                        onClick={(e) => toggleRowSelection(rowId, e)}
                                    />
                                </div>
                            </td>
                        )}
                        <td className={cn(
                            "p-2 text-[10px] text-[var(--app-text-secondary)] font-mono text-center border-r border-[var(--app-border)] bg-[var(--app-bg)]/50",
                            focusedCell?.row === rowIdx ? currentTheme.glow : ""
                        )}>
                            {(currentPage - 1) * itemsPerPage + rowIdx + 1}
                        </td>
                        {columns.map((col, colIdx) => {
                            const isFocused = focusedCell?.row === rowIdx && focusedCell?.col === colIdx;
                            const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;

                            const isCellInSelection = selection ? (
                                rowIdx >= Math.min(selection.start.row, selection.end.row) &&
                                rowIdx <= Math.max(selection.start.row, selection.end.row) &&
                                colIdx >= Math.min(selection.start.col, selection.end.col) &&
                                colIdx <= Math.max(selection.start.col, selection.end.col)
                            ) : false;

                            return (
                                <td
                                    key={colIdx}
                                    data-row-index={rowIdx}
                                    data-col-index={colIdx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRowClick?.(row);
                                        handleCellClick(rowIdx, colIdx, e.shiftKey);
                                    }}
                                    onMouseDown={(e) => handleMouseDownCell(e, rowIdx, colIdx)}
                                    onMouseEnter={() => handleMouseEnterCell()}
                                    onDoubleClick={() => { onRowDoubleClick?.(row); if (col.isEditable) startEditing(rowIdx, colIdx); }}
                                    className={cn(
                                        "p-0 text-[11px] font-medium border-r border-gray-300 dark:border-slate-700/50 transition-all cursor-cell relative",
                                        isFocused && !isEditing ? cn("outline-2 outline -outline-offset-2 outline-blue-600 dark:outline-blue-400 z-10", currentTheme.glow, "bg-blue-50/50 dark:bg-blue-900/30") : "",
                                        isCellInSelection && !isFocused ? "bg-blue-50/20 dark:bg-blue-900/10" : "",
                                        isRTL ? "[&>*:first-child]:text-left [&>*:first-child]:rtl:text-right" : "",
                                        col.align === 'center' ? "text-center" : "",
                                        col.align === 'right' ? "text-right" : "",
                                        col.align === 'left' ? "text-left" : "",
                                        col.className || ''
                                    )}
                                >
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editValue}
                                            autoFocus
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={saveEdit}
                                            onKeyDown={handleEditInputKeyDown}
                                            className={cn(
                                                "w-full h-full min-h-[36px] bg-blue-100/80 dark:bg-blue-900/50 outline-none border-2 border-blue-600 dark:border-blue-400 p-2 font-semibold text-[var(--app-text)]",
                                                currentTheme.glow,
                                                col.className
                                            )}
                                        />
                                    ) : (
                                        <div className="p-2 w-full h-full min-h-[36px]">{col.accessor(row)}</div>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                );
            })}

            {paddingBottom > 0 && (
                <tr>
                    <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length + (enableSelection ? 2 : 1)} />
                </tr>
            )}
        </tbody>
    );
}
