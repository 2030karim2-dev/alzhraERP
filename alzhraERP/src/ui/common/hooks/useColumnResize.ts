// ============================================
// useColumnResize — Hook مشتركة لتغيير حجم أعمدة الجداول
// قابلة للاستخدام في أي جدول عبر storageKey مخصص
// v2: دعم RTL صريح + تحديثات rAF ناعمة 60fps + قياس فعلي للعرض
// ============================================
import { useState, useRef, useCallback, useEffect } from 'react';

export interface ColumnWidths {
    [field: string]: number;
}

interface UseColumnResizeOptions {
    /** مفتاح التخزين في localStorage لحفظ عرض الأعمدة (اختياري — بدون حفظ عند غيابه) */
    storageKey?: string;
    /** العرض الافتراضي للأعمدة */
    defaultWidths?: ColumnWidths;
    /** الحد الأدنى لعرض أي عمود بالـ px */
    minWidth?: number;
    /** اتجاه RTL صريح — عند غيابه يُكتشف من document.dir */
    isRTL?: boolean;
}

interface UseColumnResizeReturn {
    colWidths: ColumnWidths;
    /** هل يوجد سحب جارٍ حالياً؟ (لتفعيل تحسينات الأداء مثل will-change) */
    isResizing: boolean;
    /** ربطها بحدث onMouseDown على مقبض تغيير الحجم في كل عمود */
    onResizeMouseDown: (e: React.MouseEvent, field: string) => void;
    /** إعادة ضبط العروض إلى الافتراضية */
    resetWidths: () => void;
}

/**
 * useColumnResize
 * Hook مشتركة لإدارة تغيير حجم أعمدة الجداول مع الحفظ في localStorage.
 * تحدّث العروض عبر requestAnimationFrame لسلاسة 60fps أثناء السحب.
 *
 * @example
 * const { colWidths, onResizeMouseDown } = useColumnResize({
 *   storageKey: 'invoice_col_widths',
 *   defaultWidths: { name: 300, quantity: 80 },
 * });
 */
export const useColumnResize = ({
    storageKey,
    defaultWidths = {},
    minWidth = 40,
    isRTL,
}: UseColumnResizeOptions): UseColumnResizeReturn => {
    // تحميل الأعراض المحفوظة من localStorage أو استخدام الافتراضية
    const [colWidths, setColWidths] = useState<ColumnWidths>(() => {
        if (!storageKey) return { ...defaultWidths };
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? { ...defaultWidths, ...JSON.parse(saved) } : { ...defaultWidths };
        } catch {
            return { ...defaultWidths };
        }
    });
    const [isResizing, setIsResizing] = useState(false);

    const resizingRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);
    const lastDeltaRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const minWidthRef = useRef(minWidth);
    const isRtlRef = useRef(
        typeof isRTL === 'boolean'
            ? isRTL
            : (typeof document !== 'undefined' ? document.dir === 'rtl' : false)
    );

    // إبقاء المراجع محدّثة دون إعادة إنشاء المعالجات
    minWidthRef.current = minWidth;
    if (typeof isRTL === 'boolean') isRtlRef.current = isRTL;

    // حفظ الأعراض عند كل تغيير
    useEffect(() => {
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(colWidths));
        } catch {
            // تجاهل أخطاء localStorage (وضع التخفي / الذاكرة ممتلئة)
        }
    }, [colWidths, storageKey]);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingRef.current) return;
        lastDeltaRef.current = e.pageX - resizingRef.current.startX;
        // دمج التحديثات بإطار رسم واحد → سحب ناعم بلا اهتزاز
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const ref = resizingRef.current;
            if (!ref) return;
            const delta = lastDeltaRef.current;
            const newWidth = Math.max(minWidthRef.current, Math.round(ref.startWidth + (isRtlRef.current ? -delta : delta)));
            setColWidths(prev => (prev[ref.field] === newWidth ? prev : { ...prev, [ref.field]: newWidth }));
        });
    }, []);

    const onMouseUp = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        resizingRef.current = null;
        setIsResizing(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [onMouseMove]);

    // تنظيف event listeners عند الـ unmount
    useEffect(() => {
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            resizingRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [onMouseMove, onMouseUp]);

    const onResizeMouseDown = useCallback((e: React.MouseEvent, field: string) => {
        e.preventDefault();
        e.stopPropagation();
        // قياس العرض الفعلي للخلية الحالية إن وُجدت — أدق من القيمة المحفوظة
        const cell = (e.target as HTMLElement).parentElement as HTMLTableCellElement | null;
        resizingRef.current = {
            field,
            startX: e.pageX,
            startWidth: cell?.offsetWidth ?? colWidths[field] ?? defaultWidths[field] ?? minWidthRef.current,
        };
        setIsResizing(true);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [colWidths, defaultWidths, onMouseMove, onMouseUp]);

    const resetWidths = useCallback(() => {
        setColWidths({ ...defaultWidths });
    }, [defaultWidths]);

    return { colWidths, isResizing, onResizeMouseDown, resetWidths };
};
