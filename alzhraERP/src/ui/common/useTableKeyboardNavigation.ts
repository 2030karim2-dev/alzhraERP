import { useState, useCallback, useEffect, useRef } from 'react';

export interface CellPosition {
    row: number;
    col: number;
}

export interface SelectionRange {
    start: CellPosition;
    end: CellPosition;
}

export interface UseTableKeyboardNavigationProps<T = any> {
    tableRef: React.RefObject<HTMLDivElement>;
    orderedData: T[];
    columns: any[];
    isRTL?: boolean | undefined;
    onRowDoubleClick?: ((row: T) => void) | undefined;
    onCellUpdate?: ((rowIndex: number, accessorKey: string, value: any) => void | Promise<void>) | undefined;
    onCopy?: ((cells: any[]) => void) | undefined;
    onPaste?: ((cells: any[]) => void) | undefined;
}

interface KeyboardShortcut {
    key: string;
    description: string;
    descriptionAr: string;
    modifier?: 'ctrl' | 'shift' | 'alt';
}

export const TABLE_SHORTCUTS: KeyboardShortcut[] = [
    { key: 'ArrowUp', description: 'Move up', descriptionAr: 'تحريك لأعلى' },
    { key: 'ArrowDown', description: 'Move down', descriptionAr: 'تحريك لأسفل' },
    { key: 'ArrowLeft', description: 'Move left', descriptionAr: 'تحريك لليسار' },
    { key: 'ArrowRight', description: 'Move right', descriptionAr: 'تحريك لليمين' },
    { key: 'Tab', description: 'Next cell', descriptionAr: 'الخلية التالية', modifier: 'shift' },
    { key: 'Enter', description: 'Edit/Save cell', descriptionAr: 'تحرير/حفظ الخلية' },
    { key: 'Escape', description: 'Cancel edit', descriptionAr: 'إلغاء التحرير' },
    { key: 'Home', description: 'First column', descriptionAr: 'العمود الأول' },
    { key: 'End', description: 'Last column', descriptionAr: 'العمود الأخير' },
    { key: 'PageUp', description: 'Previous page', descriptionAr: 'الصفحة السابقة' },
    { key: 'PageDown', description: 'Next page', descriptionAr: 'الصفحة التالية' },
    { key: 'c', description: 'Copy cells', descriptionAr: 'نسخ الخلايا', modifier: 'ctrl' },
    { key: 'v', description: 'Paste cells', descriptionAr: 'لصق الخلايا', modifier: 'ctrl' },
    { key: 'Delete', description: 'Clear cell', descriptionAr: 'مسح الخلية' },
];

export const useTableKeyboardNavigation = <T,>({
    tableRef,
    orderedData,
    columns,
    isRTL = false,
    onRowDoubleClick,
    onCellUpdate,
    onCopy,
    onPaste
}: UseTableKeyboardNavigationProps<T>) => {
    const [focusedCell, setFocusedCell] = useState<CellPosition>({ row: 0, col: 0 });
    const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
    const [editValue, setEditValue] = useState<any>('');
    const [selection, setSelection] = useState<SelectionRange | null>(null);
    const [clipboard, setClipboard] = useState<any[]>([]);
    const pageSizeRef = useRef(20);

    const maxRow = orderedData.length - 1;
    const maxCol = columns.length - 1;

    // Circular navigation helpers
    const wrapRow = (row: number) => {
        if (row < 0) return maxRow;
        if (row > maxRow) return 0;
        return row;
    };

    const wrapCol = (col: number) => {
        if (col < 0) return maxCol;
        if (col > maxCol) return 0;
        return col;
    };

    // Get navigation direction based on RTL mode
    const getLeftRightDelta = useCallback((forward: boolean): number => {
        if (isRTL) return forward ? -1 : 1;
        return forward ? 1 : -1;
    }, [isRTL]);

    const moveFocus = useCallback((r: number, c: number, wrap: boolean = true) => {
        const newRow = wrap ? wrapRow(r) : Math.max(0, Math.min(maxRow, r));
        const newCol = wrap ? wrapCol(c) : Math.max(0, Math.min(maxCol, c));
        setFocusedCell({ row: newRow, col: newCol });

        // Clear selection when moving focus
        setSelection(null);

        // Scroll cell into view
        setTimeout(() => {
            const cell = tableRef.current?.querySelector(`[data-row-index='${newRow}'][data-col-index='${newCol}']`);
            if (cell) {
                cell.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                
                // Fix for possible range issue: if something tries to select this cell's content
                // we should ensure it's actually in the DOM first.
            }
        }, 0);
    }, [tableRef, maxRow, maxCol]);

    const startEditing = useCallback((rowIdx: number, colIdx: number) => {
        const col = columns[colIdx];
        if (col && col.isEditable && onCellUpdate && col.accessorKey) {
            const row = orderedData[rowIdx];
            setEditValue(row ? (row as Record<string, unknown>)[col.accessorKey as string] : '');
            setEditingCell({ row: rowIdx, col: colIdx });
        }
    }, [columns, onCellUpdate, orderedData]);

    const saveEdit = useCallback(async () => {
        if (editingCell && onCellUpdate) {
            const { row, col } = editingCell;
            const colDef = columns[col];
            if (colDef && colDef.accessorKey) {
                await onCellUpdate(row, colDef.accessorKey as string, editValue);
            }
        }
        setEditingCell(null);
    }, [editingCell, columns, onCellUpdate, editValue]);

    const cancelEdit = useCallback(() => {
        setEditingCell(null);
        setEditValue('');
    }, []);

    // Clear cell content
    const clearCell = useCallback(async () => {
        if (focusedCell && onCellUpdate) {
            const { row, col } = focusedCell;
            const colDef = columns[col];
            if (colDef && colDef.accessorKey && colDef.isEditable) {
                await onCellUpdate(row, colDef.accessorKey as string, '');
            }
        }
    }, [focusedCell, columns, onCellUpdate]);

    // Copy selected cells
    const copyCells = useCallback(() => {
        const cells: any[] = [];
        const { row, col } = focusedCell;
        const colDef = columns[col];

        if (colDef && colDef.accessorKey) {
            const rowData = orderedData[row];
            if (rowData) {
                const value = (rowData as Record<string, unknown>)[colDef.accessorKey as string];
                cells.push(value);
                setClipboard([value]);
                onCopy?.([value]);
            }
        }
    }, [focusedCell, columns, orderedData, onCopy]);

    // Copy multiple selected cells
    const copySelection = useCallback(() => {
        if (!selection) {
            copyCells();
            return;
        }

        const { start, end } = selection;
        const minRow = Math.min(start.row, end.row);
        const maxRowSel = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxColSel = Math.max(start.col, end.col);

        const cells: any[][] = [];
        const flatCells: any[] = [];

        for (let r = minRow; r <= maxRowSel; r++) {
            const rowCells: any[] = [];
            for (let c = minCol; c <= maxColSel; c++) {
                const colDef = columns[c];
                const rowData = orderedData[r];
                const value = rowData && colDef?.accessorKey ? (rowData as Record<string, unknown>)[colDef.accessorKey as string] : '';
                rowCells.push(value);
                flatCells.push(value);
            }
            cells.push(rowCells);
        }

        setClipboard(flatCells);
        onCopy?.(flatCells);
    }, [selection, columns, orderedData, copyCells, onCopy]);

    // Paste to cell
    const pasteCells = useCallback(async () => {
        if (clipboard.length === 0 || !onCellUpdate) return;

        const { row, col } = focusedCell;
        const colDef = columns[col];

        if (colDef && colDef.accessorKey && colDef.isEditable) {
            // If single value, paste to current cell
            if (clipboard.length === 1) {
                await onCellUpdate(row, colDef.accessorKey as string, clipboard[0]);
            } else {
                // If multiple values, paste starting from current cell
                for (let i = 0; i < clipboard.length; i++) {
                    const targetRow = row + i;
                    if (targetRow < orderedData.length) {
                        const targetColDef = columns[col + i] || colDef;
                        if (targetColDef?.accessorKey) {
                            await onCellUpdate(targetRow, targetColDef.accessorKey as string, clipboard[i]);
                        }
                    }
                }
            }
        }

        onPaste?.(clipboard);
    }, [clipboard, focusedCell, columns, orderedData, onCellUpdate, onPaste]);

    // Handle Shift+Click for selection
    const handleCellClick = useCallback((row: number, col: number, shiftKey: boolean) => {
        if (shiftKey && focusedCell) {
            setSelection({ start: focusedCell, end: { row, col } });
        } else {
            setFocusedCell({ row, col });
            setSelection(null);
        }
    }, [focusedCell]);

    // Handle mouse-based selection
    const startSelection = useCallback((row: number, col: number) => {
        setFocusedCell({ row, col });
        setSelection({ start: { row, col }, end: { row, col } });
    }, []);

    const updateSelection = useCallback((row: number, col: number) => {
        if (selection) {
            setSelection({ ...selection, end: { row, col } });
        }
    }, [selection]);

    const endSelection = useCallback(() => {
        // Selection is finalized
    }, []);

    useEffect(() => {
        const tableEl = tableRef.current;
        if (!tableEl) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Bypass keyboard navigation if the user is typing in an input, textarea, select, or contenteditable element
            const target = e.target as HTMLElement;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                 target.tagName === 'TEXTAREA' ||
                 target.tagName === 'SELECT' ||
                 target.isContentEditable)
            ) {
                if (editingCell && e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
                return;
            }

            // Don't handle keys if editing
            if (editingCell) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
                return;
            }

            const { row, col } = focusedCell;
            const isShift = e.shiftKey;
            const isCtrl = e.ctrlKey || e.metaKey;

            switch (e.key) {
                // Arrow keys with RTL support
                case 'ArrowUp':
                    e.preventDefault();
                    moveFocus(row - 1, col);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    moveFocus(row + 1, col);
                    break;
                case 'ArrowLeft': {
                    e.preventDefault();
                    const delta = getLeftRightDelta(false);
                    if (isShift && selection) {
                        const newCol = wrapCol(col + delta);
                        setSelection({ ...selection, end: { row, col: newCol } });
                    } else {
                        moveFocus(row, col + delta);
                    }
                    break;
                }
                case 'ArrowRight': {
                    e.preventDefault();
                    const delta = getLeftRightDelta(true);
                    if (isShift && selection) {
                        const newCol = wrapCol(col + delta);
                        setSelection({ ...selection, end: { row, col: newCol } });
                    } else {
                        moveFocus(row, col + delta);
                    }
                    break;
                }

                // Tab navigation
                case 'Tab':
                    e.preventDefault();
                    if (isShift) {
                        // Shift+Tab: go to previous cell
                        if (col > 0) {
                            moveFocus(row, col - 1);
                        } else if (row > 0) {
                            moveFocus(row - 1, columns.length - 1);
                        }
                    } else {
                        // Tab: go to next cell
                        if (col < columns.length - 1) {
                            moveFocus(row, col + 1);
                        } else if (row < orderedData.length - 1) {
                            moveFocus(row + 1, 0);
                        }
                    }
                    break;

                // Enter for editing
                case 'Enter':
                    e.preventDefault();
                    if (columns[col]?.isEditable) {
                        startEditing(row, col);
                    } else if (onRowDoubleClick) {
                        if (orderedData[row]) onRowDoubleClick(orderedData[row]);
                    } else {
                        // Move to next row
                        if (isShift) {
                            moveFocus(row - 1, col);
                        } else {
                            moveFocus(row + 1, col);
                        }
                    }
                    break;

                // Escape to cancel
                case 'Escape':
                    e.preventDefault();
                    cancelEdit();
                    break;

                // Home/End for first/last column
                case 'Home':
                    e.preventDefault();
                    if (isCtrl) {
                        moveFocus(0, 0);
                    } else {
                        moveFocus(row, 0);
                    }
                    break;
                case 'End':
                    e.preventDefault();
                    if (isCtrl) {
                        moveFocus(maxRow, maxCol);
                    } else {
                        moveFocus(row, maxCol);
                    }
                    break;

                // PageUp/PageDown for pagination
                case 'PageUp':
                    e.preventDefault();
                    // Move up by page size (simulated - actual pagination handled by parent)
                    moveFocus(Math.max(0, row - pageSizeRef.current), col, false);
                    break;
                case 'PageDown':
                    e.preventDefault();
                    // Move down by page size
                    moveFocus(Math.min(maxRow, row + pageSizeRef.current), col, false);
                    break;

                // Delete to clear cell
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    clearCell();
                    break;

                // Ctrl+C for copy
                case 'c':
                    if (isCtrl) {
                        e.preventDefault();
                        copySelection();
                    }
                    break;

                // Ctrl+V for paste
                case 'v':
                    if (isCtrl) {
                        e.preventDefault();
                        pasteCells();
                    }
                    break;
            }
        };

        tableEl.addEventListener('keydown', handleKeyDown);
        return () => tableEl.removeEventListener('keydown', handleKeyDown);
    }, [
        focusedCell, orderedData, columns, isRTL,
        editingCell, selection,
        cancelEdit, clearCell, copyCells, copySelection, pasteCells,
        startEditing, moveFocus, getLeftRightDelta, maxRow, maxCol, tableRef
    ]);

    return {
        focusedCell,
        setFocusedCell,
        editingCell,
        setEditingCell,
        editValue,
        setEditValue,
        selection,
        setSelection,
        clipboard,
        moveFocus,
        startEditing,
        saveEdit,
        cancelEdit,
        clearCell,
        copyCells,
        copySelection,
        pasteCells,
        handleCellClick,
        startSelection,
        updateSelection,
        endSelection,
        pageSizeRef
    };
};
