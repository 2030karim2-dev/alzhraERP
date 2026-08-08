import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook للتمرير السلس بين أقسام صفحة الهبوط
 * يدعم اكتشاف العناصر المُضافة بعد التحميل الكسول
 */
export function useLandingScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Intersection Observer for scroll-triggered animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '-50px' }
    );

    /** Observe existing + future elements with .landing-reveal */
    const observeReveal = () => {
      const revealElements = container.querySelectorAll('.landing-reveal');
      revealElements.forEach((el) => observer.observe(el));
    };

    observeReveal();

    // MutationObserver for lazy-loaded content
    const mutationObserver = new MutationObserver(() => {
      observeReveal();
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return { containerRef, scrollToSection };
}
