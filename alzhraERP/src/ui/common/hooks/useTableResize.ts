import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseTableResizeOptions {
    enableResize?: boolean;
    tableWrapperRef: React.RefObject<HTMLDivElement>;
}

export interface UseTableResizeReturn {
    columnWidths: Record<number, number>;
    customSize: { width?: string; height?: string };
    originalSize: { width?: string; height?: string };
    isResizing: boolean;
    resizeDirection: string | null;
    handleMouseDown: (e: React.MouseEvent, colIndex: number) => void;
    handleWrapperResizeStart: (direction: string, e: React.MouseEvent) => void;
    handleResetSize: () => void;
}

export const useTableResize = ({
    enableResize = true,
    tableWrapperRef
}: UseTableResizeOptions): UseTableResizeReturn => {
    const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
    const [customSize, setCustomSize] = useState<{ width?: string; height?: string }>({});
    const [originalSize, setOriginalSize] = useState<{ width?: string; height?: string }>({});
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);

    const resizingRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Save original size before resize
    const saveOriginalSize = useCallback(() => {
        if (tableWrapperRef.current && Object.keys(originalSize).length === 0) {
            setOriginalSize({
                width: tableWrapperRef.current.style.width || '',
                height: tableWrapperRef.current.style.height || ''
            });
        }
    }, [tableWrapperRef, originalSize]);

    // Handle column resize
    const handleMouseDown = useCallback((e: React.MouseEvent, colIndex: number) => {
        if (!enableResize) return;

        e.preventDefault();
        e.stopPropagation();

        const th = (e.target as HTMLElement).parentElement as HTMLTableCellElement;
        resizingRef.current = {
            colIndex,
            startX: e.clientX,
            startWidth: th.offsetWidth,
        };

        document.body.style.cursor = 'col-resize';

        // Create new abort controller for this resize session
        abortControllerRef.current = new AbortController();

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!resizingRef.current) return;

            const { colIndex, startX, startWidth } = resizingRef.current;
            const newWidth = startWidth + (moveEvent.clientX - startX);

            if (newWidth > 40) {
                setColumnWidths(prev => ({ ...prev, [colIndex]: newWidth }));
            }
        };

        const handleMouseUp = () => {
            resizingRef.current = null;
            document.body.style.cursor = '';

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };

        document.addEventListener('mousemove', handleMouseMove, { signal: abortControllerRef.current.signal });
        document.addEventListener('mouseup', handleMouseUp, { signal: abortControllerRef.current.signal });
    }, [enableResize]);

    // Handle wrapper resize start (for full table resize)
    const handleWrapperResizeStart = useCallback((direction: string, e: React.MouseEvent) => {
        if (!enableResize) return;

        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        saveOriginalSize();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = tableWrapperRef.current?.offsetWidth || 0;
        const startHeight = tableWrapperRef.current?.offsetHeight || 0;

        // Create new abort controller for this resize session
        abortControllerRef.current = new AbortController();

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!tableWrapperRef.current) return;

            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;

            if (direction.includes('e')) {
                newWidth = Math.max(400, startWidth + deltaX);
            }
            if (direction.includes('w')) {
                newWidth = Math.max(400, startWidth - deltaX);
            }
            if (direction.includes('s')) {
                newHeight = Math.max(200, startHeight + deltaY);
            }
            if (direction.includes('n')) {
                newHeight = Math.max(200, startHeight - deltaY);
            }

            setCustomSize({ width: `${newWidth}px`, height: `${newHeight}px` });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeDirection(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };

        document.addEventListener('mousemove', handleMouseMove, { signal: abortControllerRef.current.signal });
        document.addEventListener('mouseup', handleMouseUp, { signal: abortControllerRef.current.signal });
        document.body.style.cursor = `${direction}-resize`;
        document.body.style.userSelect = 'none';
    }, [enableResize, tableWrapperRef, saveOriginalSize]);

    // Reset size to original
    const handleResetSize = useCallback(() => {
        setCustomSize({});
        setColumnWidths({});
        setOriginalSize({});
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        columnWidths,
        customSize,
        originalSize,
        isResizing,
        resizeDirection,
        handleMouseDown,
        handleWrapperResizeStart,
        handleResetSize
    };
};
