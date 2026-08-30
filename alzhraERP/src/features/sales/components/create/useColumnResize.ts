import { useRef, useCallback, useEffect } from 'react';

interface UseColumnResizeProps {
  setColumnWidth: (id: string, width: number) => void;
}

export function useColumnResize({ setColumnWidth }: UseColumnResizeProps) {
  const resizingRef = useRef<{ id: string; startX: number; startWidth: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDeltaRef = useRef(0);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingRef.current) return;
      lastDeltaRef.current = e.pageX - resizingRef.current.startX;
      // دمج التحديثات بإطار رسم واحد → سلاسة أثناء السحب (60fps)
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const ref = resizingRef.current;
        if (!ref) return;
        const delta = lastDeltaRef.current;
        const newWidth = Math.max(
          30,
          Math.round(ref.startWidth + (document.dir === 'rtl' ? -delta : delta))
        );
        setColumnWidth(ref.id, newWidth);
      });
    },
    [setColumnWidth]
  );

  const onMouseUp = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onMouseMove]);

  const onMouseDown = (e: React.MouseEvent, id: string, currentWidth: number) => {
    resizingRef.current = { id, startX: e.pageX, startWidth: currentWidth };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return { onMouseDown };
}
