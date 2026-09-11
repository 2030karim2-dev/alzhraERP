import type React from 'react';

export function useTableSelection<T>(
  orderedData: T[],
  selectedRowIds: Set<string>,
  onSelectionChange?: (selectedIds: Set<string>) => void,
  getRowId?: (row: T) => string
) {
  const resolveId = (row: T, idx: number): string => {
    if (getRowId) return getRowId(row);
    const rowObj = row as Record<string, unknown> | null;
    return (rowObj?.id as string) ?? String(idx);
  };

  const isAllVisibleSelected =
    orderedData.length > 0 &&
    orderedData.every((row, idx) => selectedRowIds.has(resolveId(row, idx)));

  const hasSomeVisibleSelected =
    orderedData.length > 0 &&
    orderedData.some((row, idx) => selectedRowIds.has(resolveId(row, idx)));

  const toggleAllSelection = () => {
    if (!onSelectionChange) return;
    const newSet = new Set(selectedRowIds);

    if (isAllVisibleSelected) {
      // Deselect all visible on this page
      orderedData.forEach((row, idx) => {
        newSet.delete(resolveId(row, idx));
      });
    } else {
      // Select all visible on this page
      orderedData.forEach((row, idx) => {
        newSet.add(resolveId(row, idx));
      });
    }
    onSelectionChange(newSet);
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

  return {
    toggleAllSelection,
    toggleRowSelection,
    isAllVisibleSelected,
    hasSomeVisibleSelected,
  };
}
