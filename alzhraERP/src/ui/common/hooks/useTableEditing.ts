import { useState, useCallback } from 'react';

export interface UseTableEditingOptions {
    onCellUpdate?: (rowIndex: number, accessorKey: string, value: unknown) => void | Promise<void>;
}

export interface UseTableEditingReturn {
    editingCell: { row: number; col: number } | null;
    editValue: string;
    setEditingCell: (cell: { row: number; col: number } | null) => void;
    setEditValue: (value: string) => void;
    startEditing: (rowIdx: number, colIdx: number, columns: Array<{ accessorKey?: string; isEditable?: boolean }>) => void;
    saveEdit: (rowIdx: number, colIdx: number, columns: Array<{ accessorKey?: string; isEditable?: boolean }>) => Promise<void>;
    handleEditInputKeyDown: (
        e: React.KeyboardEvent<HTMLInputElement>,
        rowIdx: number,
        colIdx: number,
        columns: Array<{ accessorKey?: string; isEditable?: boolean }>,
        dataLength: number,
        setFocusedCell: (cell: { row: number; col: number }) => void
    ) => Promise<void>;
}

export const useTableEditing = ({
    onCellUpdate
}: UseTableEditingOptions = {}): UseTableEditingReturn => {
    const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Start editing a cell
    const startEditing = useCallback((rowIdx: number, colIdx: number, columns: Array<{ accessorKey?: string; isEditable?: boolean }>) => {
        const col = columns[colIdx];
        if (!col?.isEditable) return;

        setEditingCell({ row: rowIdx, col: colIdx });
        setEditValue('');
    }, []);

    // Save edit
    const saveEdit = useCallback(async (rowIdx: number, colIdx: number, columns: Array<{ accessorKey?: string; isEditable?: boolean }>) => {
        if (!editingCell || !onCellUpdate) return;

        const col = columns[colIdx];
        if (col?.accessorKey) {
            await onCellUpdate(rowIdx, col.accessorKey, editValue);
        }

        setEditingCell(null);
        setEditValue('');
    }, [editingCell, editValue, onCellUpdate]);

    // Handle edit input key down
    const handleEditInputKeyDown = useCallback(async (
        e: React.KeyboardEvent<HTMLInputElement>,
        rowIdx: number,
        colIdx: number,
        columns: Array<{ accessorKey?: string; isEditable?: boolean }>,
        dataLength: number,
        setFocusedCell: (cell: { row: number; col: number }) => void
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await saveEdit(rowIdx, colIdx, columns);
            if (editingCell) {
                const nextRow = Math.min(dataLength - 1, editingCell.row + 1);
                setFocusedCell({ row: nextRow, col: editingCell.col });
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditingCell(null);
            setEditValue('');
        } else if (e.key === 'Tab') {
            e.preventDefault();
            await saveEdit(rowIdx, colIdx, columns);
            if (editingCell) {
                const nextCol = e.shiftKey
                    ? Math.max(0, editingCell.col - 1)
                    : Math.min(columns.length - 1, editingCell.col + 1);
                const nextRow = nextCol !== editingCell.col
                    ? editingCell.row
                    : (e.shiftKey ? Math.max(0, editingCell.row - 1) : Math.min(dataLength - 1, editingCell.row + 1));
                setFocusedCell({ row: nextRow, col: nextCol });
            }
        }
    }, [editingCell, saveEdit]);

    return {
        editingCell,
        editValue,
        setEditingCell,
        setEditValue,
        startEditing,
        saveEdit,
        handleEditInputKeyDown
    };
};
