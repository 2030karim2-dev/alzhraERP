import { useState, useEffect, useRef, useCallback } from 'react';

export interface TableDragDropResult<T> {
  orderedData: T[];
  handlers: {
    handleDragStart: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
    handleDragEnter: (_e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
    handleDragOver: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
    handleDragEnd: (e: React.DragEvent<HTMLTableRowElement>) => void;
    handleDrop: () => void;
  };
}

export function useTableDragDrop<T>(
  initialData: T[],
  onOrderChange?: (reorderedData: T[]) => void,
  scrollContainerRef?: React.RefObject<HTMLElement | null>
): TableDragDropResult<T> {
  const [orderedData, setOrderedData] = useState<T[]>(initialData);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const autoScrollRaf = useRef<number | null>(null);

  useEffect(() => {
    setOrderedData(initialData);
  }, [initialData]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLTableRowElement>, index: number): void => {
    dragItem.current = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
    const target = e.currentTarget;
    setTimeout(() => {
      target.classList.add('opacity-50');
    }, 0);
  }, []);

  const handleDragEnter = useCallback((_e: React.DragEvent<HTMLTableRowElement>, index: number): void => {
    dragOverItem.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLTableRowElement>, index: number): void => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dragOverItem.current = index;

    // Auto-scroll the container if dragging near edges
    if (scrollContainerRef?.current) {
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const edgeThreshold = 50;
      const scrollSpeed = 12;

      if (e.clientY < rect.top + edgeThreshold) {
        if (autoScrollRaf.current === null) {
          autoScrollRaf.current = requestAnimationFrame(() => {
            container.scrollTop -= scrollSpeed;
            autoScrollRaf.current = null;
          });
        }
      } else if (e.clientY > rect.bottom - edgeThreshold) {
        if (autoScrollRaf.current === null) {
          autoScrollRaf.current = requestAnimationFrame(() => {
            container.scrollTop += scrollSpeed;
            autoScrollRaf.current = null;
          });
        }
      }
    }
  }, [scrollContainerRef]);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLTableRowElement>): void => {
    if (autoScrollRaf.current !== null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
    e.currentTarget.classList.remove('opacity-50');
    dragItem.current = null;
    dragOverItem.current = null;
  }, []);

  const handleDrop = useCallback((): void => {
    if (autoScrollRaf.current !== null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
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
  }, [orderedData, onOrderChange]);

  return {
    orderedData,
    handlers: { handleDragStart, handleDragEnter, handleDragOver, handleDragEnd, handleDrop },
  };
}

