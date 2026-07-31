import { useState, useCallback, useEffect, RefObject } from 'react';

export const useDraggableModal = (modalRef: RefObject<HTMLDivElement | null>, isOpen: boolean) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.no-drag')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - (modalRef.current?.getBoundingClientRect().left || 0),
            y: e.clientY - (modalRef.current?.getBoundingClientRect().top || 0)
        });
    }, [modalRef]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !modalRef.current) return;
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        modalRef.current.style.left = `${Math.max(0, x)}px`;
        modalRef.current.style.top = `${Math.max(0, y)}px`;
        modalRef.current.style.transform = 'none';
    }, [isDragging, dragOffset, modalRef]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
        return undefined; // consistent return
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Reset position when modal opens
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.style.left = '50%';
            modalRef.current.style.top = '50%';
            modalRef.current.style.transform = 'translate(-50%, -50%)';
        }
    }, [isOpen, modalRef]);

    return { handleMouseDown };
};
