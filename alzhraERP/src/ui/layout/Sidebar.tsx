import React, { useMemo } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import SidebarLogo from './sidebar/SidebarLogo';
import SidebarNav from './sidebar/SidebarNav';
import SidebarFooter from './sidebar/SidebarFooter';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { cn } from '../../core/utils';
import { useDevice } from '../../lib/hooks/useDevice';
import { useOrientation } from '../../lib/hooks/useOrientation';
import { useCurrentBreakpoint } from '../../lib/hooks/useBreakpoint';
import { getCollapsedSidebarWidth, getExpandedSidebarWidth } from './sidebarSizing';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  sidebarWidth?: string;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  toggleSidebar,
  isMobileOpen,
  onCloseMobile,
  sidebarWidth = 'w-20',
  className,
}) => {
  const { dir, t } = useTranslation();
  const { isIPad } = useDevice();
  const { isTabletLandscape } = useOrientation();
  const breakpoint = useCurrentBreakpoint();

  const ChevronForward = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const ChevronBack = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const isWideDesktop = breakpoint === '3xl' || breakpoint === '4xl' || breakpoint === '5xl';

  // Dynamic sidebar width based on screen size
  const dynamicWidth = useMemo(() => {
    const computedWidth = getCollapsedSidebarWidth({
      breakpoint,
      isIPad,
      isTabletLandscape,
    });

    return computedWidth || sidebarWidth;
  }, [breakpoint, isIPad, isTabletLandscape, sidebarWidth]);

  // Expanded width for large screens
  const expandedWidth = useMemo(() => {
    return getExpandedSidebarWidth({
      breakpoint,
      isIPad,
      isTabletLandscape,
    });
  }, [breakpoint, isIPad, isTabletLandscape]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 z-20 hidden h-screen flex-col border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl transition-[width] duration-150 ease-out md:flex',
          dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
          isCollapsed ? dynamicWidth : expandedWidth,
          className
        )}
      >
        <SidebarLogo isCollapsed={isCollapsed} />

        <div className="flex flex-1 flex-col overflow-hidden border-t dark:border-slate-800">
          <SidebarNav isCollapsed={isCollapsed} />
        </div>

        <SidebarFooter isCollapsed={isCollapsed} />

        {/* Toggle Button - hide on very large screens when expanded */}
        {isWideDesktop && !isCollapsed ? null : (
          <button
            onClick={toggleSidebar}
            className={cn(
              'absolute top-20 z-30 flex h-7 w-7 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-lg transition-colors hover:bg-[var(--app-surface-hover)] hover:text-blue-600',
              dir === 'rtl' ? '-left-3.5' : '-right-3.5'
            )}
            title={isCollapsed ? t('expand') || 'توسيع القائمة' : t('collapse') || 'طي القائمة'}
          >
            {isCollapsed ? (
              <ChevronForward size={14} strokeWidth={3} />
            ) : (
              <ChevronBack size={14} strokeWidth={3} />
            )}
          </button>
        )}
      </aside>

      {/* Mobile Sidebar - Nimble, Sleek & Compact */}
      <aside
        className={cn(
          'fixed inset-y-0 z-50 flex w-60 max-w-[72vw] flex-col bg-[var(--app-surface)] shadow-2xl transition-transform duration-300 ease-out sm:w-64 md:hidden',
          dir === 'rtl'
            ? 'right-0 rounded-l-3xl border-l border-[var(--app-border)]'
            : 'left-0 rounded-r-3xl border-r border-[var(--app-border)]',
          // Fix: Slide from Right (+100%) in RTL, Slide from Left (-100%) in LTR
          isMobileOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full',
          className
        )}
      >
        <div className="bg-[var(--app-surface-hover)]/40 flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3.5">
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              النظاري ERP
            </span>
            <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
              القائمة الرئيسية
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="إغلاق القائمة"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--app-text-secondary)] transition-all hover:bg-rose-50 hover:text-rose-500 active:scale-90 dark:hover:bg-rose-900/20"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="custom-scrollbar flex-1 overflow-y-auto py-2"
          onClick={() => {
            onCloseMobile();
          }}
        >
          <SidebarNav isCollapsed={false} />
        </div>

        <div className="bg-[var(--app-surface-hover)]/30 border-[var(--app-border)]/60 border-t">
          <SidebarFooter isCollapsed={false} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
