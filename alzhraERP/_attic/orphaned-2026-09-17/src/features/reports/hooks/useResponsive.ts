import { useState, useEffect } from 'react';

interface ResponsiveInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Width less than 768px */
  isSm: boolean;
  /** Width between 768px and 1024px */
  isMd: boolean;
  /** Width greater than 1024px */
  isLg: boolean;
}

const MOBILE_BP = 768;
const TABLET_BP = 1024;

export function useResponsive(): ResponsiveInfo {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : MOBILE_BP
  );

  useEffect(() => {
    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setWidth(window.innerWidth);
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isMobile: width < MOBILE_BP,
    isTablet: width >= MOBILE_BP && width < TABLET_BP,
    isDesktop: width >= TABLET_BP,
    isSm: width < MOBILE_BP,
    isMd: width >= MOBILE_BP && width < TABLET_BP,
    isLg: width >= TABLET_BP,
  };
}
