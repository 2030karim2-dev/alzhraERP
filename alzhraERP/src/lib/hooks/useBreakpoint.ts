import { useState, useEffect } from 'react';

// Extended breakpoints matching Tailwind config
const BREAKPOINTS = {
  // Mobile
  'xs': 480,
  'sm': 640,
  // Tablet
  'md': 768,
  'lg': 1024,
  'xl': 1280,
  // Desktop
  '2xl': 1536,
  // Mac Large Screens
  '3xl': 1920,
  '4xl': 2560,
  '5xl': 3440,
};

export type BreakpointKey = keyof typeof BREAKPOINTS;

// Check if we're at or above a breakpoint
export const useBreakpoint = (breakpoint: BreakpointKey): boolean => {
  const [isAbove, setIsAbove] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsAbove(window.innerWidth >= BREAKPOINTS[breakpoint]);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return isAbove;
};

// Hook to get current breakpoint
export const useCurrentBreakpoint = (): BreakpointKey => {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>('xs');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      if (width >= BREAKPOINTS['5xl']) setBreakpoint('5xl');
      else if (width >= BREAKPOINTS['4xl']) setBreakpoint('4xl');
      else if (width >= BREAKPOINTS['3xl']) setBreakpoint('3xl');
      else if (width >= BREAKPOINTS['2xl']) setBreakpoint('2xl');
      else if (width >= BREAKPOINTS['xl']) setBreakpoint('xl');
      else if (width >= BREAKPOINTS['lg']) setBreakpoint('lg');
      else if (width >= BREAKPOINTS['md']) setBreakpoint('md');
      else if (width >= BREAKPOINTS['sm']) setBreakpoint('sm');
      else setBreakpoint('xs');
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return breakpoint;
};

// Get breakpoint value
export const getBreakpointValue = (breakpoint: BreakpointKey): number => {
  return BREAKPOINTS[breakpoint];
};

export default useBreakpoint;
