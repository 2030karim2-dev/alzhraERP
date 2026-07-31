import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseTableDragOptions {
    enableDrag?: boolean;
    isZoomed?: boolean;
    tableWrapperRef: React.RefObject<HTMLDivElement>;
}

export interface UseTableDragReturn {
    isDragging: boolean;
    position: { x: number; y: number };
    handleTableDragStart: (e: React.MouseEvent) => void;
}

export const useTableDrag = ({
    enableDrag = false,
    isZoomed = false,
    tableWrapperRef
}: UseTableDragOptions): UseTableDragReturn => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const abortControllerRef = useRef<AbortController | null>(null);

    // Handle drag start
    const handleTableDragStart = useCallback((e: React.MouseEvent) => {
        if (!enableDrag || isZoomed) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);

        const rect = tableWrapperRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }

        // Create new abort controller for this drag session
        abortControllerRef.current = new AbortController();

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newX = moveEvent.clientX - dragOffset.x;
            const newY = moveEvent.clientY - dragOffset.y;
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };

        document.addEventListener('mousemove', handleMouseMove, { signal: abortControllerRef.current.signal });
        document.addEventListener('mouseup', handleMouseUp, { signal: abortControllerRef.current.signal });
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, [enableDrag, isZoomed, tableWrapperRef, dragOffset]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        isDragging,
        position,
        handleTableDragStart
    };
};
