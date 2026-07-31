// ============================================
// useColumnResize — Hook مشتركة لتغيير حجم أعمدة الجداول
// قابلة للاستخدام في أي جدول عبر storageKey مخصص
// ============================================
import { useState, useRef, useCallback, useEffect } from 'react';

interface ColumnWidths {
    [field: string]: number;
}

interface UseColumnResizeOptions {
    /** مفتاح التخزين في localStorage لحفظ عرض الأعمدة */
    storageKey: string;
    /** العرض الافتراضي للأعمدة */
    defaultWidths: ColumnWidths;
    /** الحد الأدنى لعرض أي عمود بالـ px */
    minWidth?: number;
}

interface UseColumnResizeReturn {
    colWidths: ColumnWidths;
    /** ربطها بحدث onMouseDown على مقبض تغيير الحجم في كل عمود */
    onResizeMouseDown: (e: React.MouseEvent, field: string) => void;
}

/**
 * useColumnResize
 * Hook مشتركة لإدارة تغيير حجم أعمدة الجداول مع الحفظ في localStorage.
 *
 * @example
 * const { colWidths, onResizeMouseDown } = useColumnResize({
 *   storageKey: 'invoice_col_widths',
 *   defaultWidths: { name: 300, quantity: 80 },
 * });
 */
export const useColumnResize = ({
    storageKey,
    defaultWidths,
    minWidth = 40,
}: UseColumnResizeOptions): UseColumnResizeReturn => {
    // تحميل الأعراض المحفوظة من localStorage أو استخدام الافتراضية
    const [colWidths, setColWidths] = useState<ColumnWidths>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? { ...defaultWidths, ...JSON.parse(saved) } : defaultWidths;
        } catch {
            return defaultWidths;
        }
    });

    // حفظ الأعراض عند كل تغيير
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(colWidths));
        } catch {
            // تجاهل أخطاء localStorage (وضع التخفي / الذاكرة ممتلئة)
        }
    }, [colWidths, storageKey]);

    const resizingRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingRef.current) return;
        const { field, startX, startWidth } = resizingRef.current;
        const delta = e.pageX - startX;
        const isRtl = document.dir === 'rtl';
        setColWidths(prev => ({
            ...prev,
            [field]: Math.max(minWidth, startWidth + (isRtl ? -delta : delta))
        }));
    }, [minWidth]);

    const onMouseUp = useCallback(() => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [onMouseMove]);

    // تنظيف event listeners عند الـ unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    const onResizeMouseDown = useCallback((e: React.MouseEvent, field: string) => {
        resizingRef.current = {
            field,
            startX: e.pageX,
            startWidth: colWidths[field] ?? defaultWidths[field] ?? minWidth,
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }, [colWidths, defaultWidths, minWidth, onMouseMove, onMouseUp]);

    return { colWidths, onResizeMouseDown };
};
