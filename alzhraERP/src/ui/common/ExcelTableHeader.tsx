import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../core/utils';
import { Column } from './ExcelTable';

interface ExcelTableHeaderProps<T> {
    columns: Column<T>[];
    enableSelection: boolean;
    orderedDataLength: number;
    selectedRowIdsSize: number;
    toggleAllSelection: () => void;
    columnWidths: Record<number, number>;
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
    isLoading
}: ExcelTableHeaderProps<T>) {
    return (
        <thead className="sticky top-0 z-[12] shadow-sm bg-[var(--app-bg)]/95 backdrop-blur-sm">
            <tr className="border-b border-[var(--app-border)] text-[var(--app-text)]">
                {enableSelection && (
                    <th className="w-10 p-2 text-center border-r border-[var(--app-border)] relative">
                        <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                            checked={orderedDataLength > 0 && selectedRowIdsSize === orderedDataLength}
                            onChange={toggleAllSelection}
                            disabled={isLoading || orderedDataLength === 0}
                        />
                    </th>
                )}
                <th className="w-10 p-2 text-[10px] text-[var(--app-text-secondary)] font-semibold border-r border-[var(--app-border)] relative">#</th>
                {columns.map((col, idx) => (
                    <th
                        key={idx}
                        style={{ width: columnWidths[idx] ? `${columnWidths[idx]}px` : col.width }}
                        onClick={() => !isLoading && col.sortKey && handleSort(col.sortKey as string)}
                        className={cn(
                            "relative p-2 border-r border-gray-300 dark:border-slate-700/50",
                            !isLoading && col.sortKey ? "cursor-pointer select-none hover:bg-[var(--app-surface-hover)]" : ""
                        )}
                    >
                        <div className={cn(
                            "flex items-center gap-1",
                            col.align === 'center' || !col.align ? "justify-center text-center" : "",
                            col.align === 'right' ? "justify-end text-right" : "",
                            col.align === 'left' ? "justify-start text-left" : "",
                            isRTL ? "flex-row-reverse" : ""
                        )}>
                            <span>{col.header}</span>
                            {col.sortKey && (
                                <div className="flex flex-col">
                                    <ChevronUp size={8} className={cn("text-gray-400", sortConfig?.key === col.sortKey && sortConfig.direction === 'asc' ? "text-blue-600" : "opacity-30")} />
                                    <ChevronDown size={8} className={cn("text-gray-400", sortConfig?.key === col.sortKey && sortConfig.direction === 'desc' ? "text-blue-600" : "opacity-30")} />
                                </div>
                            )}
                        </div>
                        {/* Column Resize Handle */}
                        <div
                            onMouseDown={(e) => handleMouseDown(e, idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-[13]"
                            style={isRTL ? { left: 0, right: 'auto' } : { right: 0 }}
                        />
                    </th>
                ))}
            </tr>
        </thead>
    );
}
