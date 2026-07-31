// ============================================
// useTabIndicator — منطق حساب موضع مؤشر التاب المتحرك
// ============================================
import { useState, useRef, useCallback, useEffect, RefObject, MutableRefObject } from 'react';

interface TabRefs { [key: string]: HTMLButtonElement | null; }
interface IndicatorPosition { x: number; width: number; opacity: number; }

const isRTL = () =>
    document.documentElement.dir === 'rtl' ||
    document.documentElement.getAttribute('dir') === 'rtl';

interface UseTabIndicatorOptions {
    activeTab: string;
    tabRefs: MutableRefObject<TabRefs>;
    containerRef: RefObject<HTMLDivElement | null>;
}

export const useTabIndicator = ({ activeTab, tabRefs, containerRef }: UseTabIndicatorOptions) => {
    const [indicatorPosition, setIndicatorPosition] = useState<IndicatorPosition>({ x: 0, width: 0, opacity: 0 });
    const animationFrameId = useRef<number | null>(null);
    const isFirstRender = useRef(true);

    const updateIndicatorPosition = useCallback((animate: boolean = true) => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

        animationFrameId.current = requestAnimationFrame(() => {
            const activeTabRef = tabRefs.current[activeTab];
            const container = containerRef.current;
            if (!activeTabRef || !container) {
                setIndicatorPosition(prev => ({ ...prev, opacity: 0 }));
                return;
            }

            const containerRect = container.getBoundingClientRect();
            const tabRect = activeTabRef.getBoundingClientRect();
            const rtl = isRTL();
            const containerStyle = window.getComputedStyle(container);
            const paddingLeft = parseFloat(containerStyle.paddingLeft);
            const paddingRight = parseFloat(containerStyle.paddingRight);

            let x = rtl
                ? containerRect.right - tabRect.right - paddingRight
                : tabRect.left - containerRect.left - paddingLeft;

            setIndicatorPosition({ x, width: tabRect.width, opacity: animate ? 1 : 0 });
        });
    }, [activeTab, tabRefs, containerRef]);

    // تحديث الموضع عند تغيير التاب النشط
    useEffect(() => {
        let t1: NodeJS.Timeout | number | undefined;
        let t2: NodeJS.Timeout | number | undefined;

        if (isFirstRender.current) {
            isFirstRender.current = false;
            t1 = setTimeout(() => updateIndicatorPosition(false), 0);
            t2 = setTimeout(() => setIndicatorPosition(prev => ({ ...prev, opacity: 1 })), 50);
        } else {
            updateIndicatorPosition(true);
        }

        return () => {
            if (t1) clearTimeout(t1);
            if (t2) clearTimeout(t2);
        };
    }, [activeTab, updateIndicatorPosition]);

    // تحديث الموضع عند تغيير حجم الـ container
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(() => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = requestAnimationFrame(() => updateIndicatorPosition(false));
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [containerRef, updateIndicatorPosition]);

    // تنظيف عند الـ unmount
    useEffect(() => {
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, []);

    return { indicatorPosition };
};
