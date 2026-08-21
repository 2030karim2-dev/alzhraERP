import { useState, useEffect, useRef } from 'react';

export interface TableDragDropResult<T> {
  orderedData: T[];
  handlers: {
    handleDragStart: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
    handleDragEnter: (_e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
    handleDragEnd: (e: React.DragEvent<HTMLTableRowElement>) => void;
    handleDrop: () => void;
  };
}

export function useTableDragDrop<T>(
  initialData: T[],
  onOrderChange?: (reorderedData: T[]) => void
): TableDragDropResult<T> {
  const [orderedData, setOrderedData] = useState<T[]>(initialData);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    setOrderedData(initialData);
  }, [initialData]);

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number): void => {
    dragItem.current = index;
    const target = e.currentTarget;
    setTimeout(() => {
      target.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnter = (_e: React.DragEvent<HTMLTableRowElement>, index: number): void => {
    dragOverItem.current = index;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>): void => {
    e.currentTarget.classList.remove('opacity-50');
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDrop = (): void => {
    if (
      dragItem.current === null ||
      dragOverItem.current === null ||
      dragItem.current === dragOverItem.current
    )
      return;
    const newOrderedData = [...orderedData];
    const [dragged] = newOrderedData.splice(dragItem.current, 1);
    newOrderedData.splice(dragOverItem.current, 0, dragged);
    setOrderedData(newOrderedData);
    onOrderChange?.(newOrderedData);
  };

  return {
    orderedData,
    handlers: { handleDragStart, handleDragEnter, handleDragEnd, handleDrop },
  };
}
