import React from 'react';

export function useTableSelection<T>(
    orderedData: T[],
    selectedRowIds: Set<string>,
    onSelectionChange?: (selectedIds: Set<string>) => void,
    getRowId?: (row: T) => string
) {
    const toggleAllSelection = () => {
        if (!onSelectionChange || !getRowId) return;
        if (selectedRowIds.size === orderedData.length && orderedData.length > 0) {
            // Deselect all
            onSelectionChange(new Set());
        } else {
            // Select all visible
            const newSet = new Set(selectedRowIds);
            orderedData.forEach(row => newSet.add(getRowId(row)));
            onSelectionChange(newSet);
        }
    };

    const toggleRowSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSelectionChange) return;
        const newSet = new Set(selectedRowIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        onSelectionChange(newSet);
    };

    return { toggleAllSelection, toggleRowSelection };
}
