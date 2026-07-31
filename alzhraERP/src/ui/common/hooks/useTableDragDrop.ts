import { useState, useEffect, useRef } from 'react';

export function useTableDragDrop<T>(
    initialData: T[],
    onOrderChange?: (reorderedData: T[]) => void
) {
    const [orderedData, setOrderedData] = useState<T[]>(initialData);

    useEffect(() => {
        setOrderedData(initialData);
    }, [initialData]);

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        dragItem.current = index;
        setTimeout(() => e.currentTarget.classList.add('opacity-50'), 0);
    };

    const handleDragEnter = (_e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.currentTarget.classList.remove('opacity-50');
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleDrop = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;

        const newOrderedData = [...orderedData];
        const dragItemContent = newOrderedData.splice(dragItem.current, 1)[0];
        newOrderedData.splice(dragOverItem.current, 0, dragItemContent);
        setOrderedData(newOrderedData);
        if (onOrderChange) {
            onOrderChange(newOrderedData);
        }
    };

    return {
        orderedData,
        handlers: {
            handleDragStart,
            handleDragEnter,
            handleDragEnd,
            handleDrop
        }
    };
}
