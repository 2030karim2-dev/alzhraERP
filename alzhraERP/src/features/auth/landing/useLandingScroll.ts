import { useRef, useCallback, type RefObject } from 'react';

interface LandingScrollResult {
  containerRef: RefObject<HTMLDivElement | null>;
  scrollToSection: (ref: RefObject<HTMLDivElement | null>) => void;
}

/**
 * Hook للتمرير السلس بين أقسام صفحة الهبوط
 */
export function useLandingScroll(): LandingScrollResult {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((ref: RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return { containerRef, scrollToSection };
}
