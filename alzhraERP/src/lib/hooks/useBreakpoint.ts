import { useState, useEffect } from 'react';

// Extended breakpoints matching Tailwind config
const BREAKPOINTS = {
  // Mobile
  xs: 480,
  sm: 640,
  // Tablet
  md: 768,
  lg: 1024,
  xl: 1280,
  // Desktop
  '2xl': 1536,
  // Mac Large Screens
  '3xl': 1920,
  '4xl': 2560,
  '5xl': 3440,
};

export type BreakpointKey = keyof typeof BREAKPOINTS;

// هل نحن عند أو فوق نقطة توقف معيّنة؟
// استخدام matchMedia بدل window.resize: لا يُحسب إلا عند تغيّر الحالة الفعلية
// (يمنع إعادة الرسم المتكرر أثناء سحب قوائم المتصفح / تغيّر شريط العنوان)
export const useBreakpoint = (breakpoint: BreakpointKey): boolean => {
  const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    setMatches(mql.matches); // sync initial state (SSR-safe)
    mql.addEventListener('change', handleChange);
    return () => {
      mql.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

// Hook to get current breakpoint
export const useCurrentBreakpoint = (): BreakpointKey => {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>(() =>
    typeof window === 'undefined' ? 'xs' : getCurrentBreakpointFromWidth(window.innerWidth)
  );

  useEffect(() => {
    const mqls = (Object.entries(BREAKPOINTS) as Array<[BreakpointKey, number]>).map(
      ([key, width]) => ({
        key,
        mql: window.matchMedia(`(min-width: ${width}px)`),
      })
    );

    const handleChange = () => {
      setBreakpoint(getCurrentBreakpointFromWidth(window.innerWidth));
    };

    mqls.forEach(({ mql }) => {
      mql.addEventListener('change', handleChange);
    });
    // احسب الحالة الأولية + استجب لأي تغيير محتمل
    handleChange();

    return () => {
      mqls.forEach(({ mql }) => {
        mql.removeEventListener('change', handleChange);
      });
    };
  }, []);

  return breakpoint;
};

// قراءة نقطة التوقف الحالية من عرض الشاشة (تُستخدم في التهيئة والمعالجة)
function getCurrentBreakpointFromWidth(width: number): BreakpointKey {
  if (width >= BREAKPOINTS['5xl']) return '5xl';
  if (width >= BREAKPOINTS['4xl']) return '4xl';
  if (width >= BREAKPOINTS['3xl']) return '3xl';
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

// Get breakpoint value
export const getBreakpointValue = (breakpoint: BreakpointKey): number => {
  return BREAKPOINTS[breakpoint];
};

export default useBreakpoint;
