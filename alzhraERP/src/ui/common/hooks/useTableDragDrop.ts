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
  const scrollDirectionRef = useRef<-1 | 1 | 0>(0);

  useEffect(() => {
    setOrderedData(initialData);
  }, [initialData]);

  const stopAutoScroll = useCallback(() => {
    scrollDirectionRef.current = 0;
    if (autoScrollRaf.current !== null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(
    (direction: -1 | 1) => {
      scrollDirectionRef.current = direction;
      if (autoScrollRaf.current !== null) return;

      const step = () => {
        if (!scrollContainerRef?.current || scrollDirectionRef.current === 0) {
          autoScrollRaf.current = null;
          return;
        }
        scrollContainerRef.current.scrollTop += scrollDirectionRef.current * 12;
        autoScrollRaf.current = requestAnimationFrame(step);
      };
      autoScrollRaf.current = requestAnimationFrame(step);
    },
    [scrollContainerRef]
  );

  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>, index: number): void => {
      dragItem.current = index;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      }
      const target = e.currentTarget;
      setTimeout(() => {
        if (target) {
          target.classList.add('opacity-50');
        }
      }, 0);
    },
    []
  );

  const handleDragEnter = useCallback(
    (_e: React.DragEvent<HTMLTableRowElement>, index: number): void => {
      dragOverItem.current = index;
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>, index: number): void => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      dragOverItem.current = index;

      // Continuous auto-scroll container when hovering near top/bottom edges
      if (scrollContainerRef?.current) {
        const container = scrollContainerRef.current;
        const rect = container.getBoundingClientRect();
        const edgeThreshold = 50;

        if (e.clientY < rect.top + edgeThreshold) {
          startAutoScroll(-1);
        } else if (e.clientY > rect.bottom - edgeThreshold) {
          startAutoScroll(1);
        } else {
          stopAutoScroll();
        }
      }
    },
    [scrollContainerRef, startAutoScroll, stopAutoScroll]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>): void => {
      stopAutoScroll();
      if (e.currentTarget) {
        e.currentTarget.classList.remove('opacity-50');
      }
      dragItem.current = null;
      dragOverItem.current = null;
    },
    [stopAutoScroll]
  );

  const handleDrop = useCallback((): void => {
    stopAutoScroll();
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
  }, [orderedData, onOrderChange, stopAutoScroll]);

  return {
    orderedData,
    handlers: { handleDragStart, handleDragEnter, handleDragOver, handleDragEnd, handleDrop },
  };
}
