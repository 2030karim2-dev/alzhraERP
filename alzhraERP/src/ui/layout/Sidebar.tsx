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
  className
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
          'hidden md:flex flex-col fixed inset-y-0 z-20 bg-[var(--app-surface)] h-screen border-[var(--app-border)] transition-[width] duration-150 ease-out shadow-xl',
          dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
          isCollapsed ? dynamicWidth : expandedWidth,
          className
        )}
      >
        <SidebarLogo isCollapsed={isCollapsed} />

        <div className="flex-1 flex flex-col overflow-hidden border-t dark:border-slate-800">
          <SidebarNav isCollapsed={isCollapsed} />
        </div>

        <SidebarFooter isCollapsed={isCollapsed} />

        {/* Toggle Button - hide on very large screens when expanded */}
        {isWideDesktop && !isCollapsed ? null : (
          <button
            onClick={toggleSidebar}
            className={cn(
              "absolute top-20 bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)] w-7 h-7 flex items-center justify-center rounded-md shadow-lg hover:bg-[var(--app-surface-hover)] hover:text-blue-600 transition-colors z-30",
              dir === 'rtl' ? '-left-3.5' : '-right-3.5'
            )}
            title={isCollapsed ? (t('expand') || 'توسيع القائمة') : (t('collapse') || 'طي القائمة')}
          >
            {isCollapsed ? <ChevronForward size={14} strokeWidth={3} /> : <ChevronBack size={14} strokeWidth={3} />}
          </button>
        )}
      </aside>

      {/* Mobile Sidebar - Nimble, Sleek & Compact */}
      <aside
        className={cn(
          'md:hidden fixed inset-y-0 w-60 sm:w-64 max-w-[72vw] bg-[var(--app-surface)] shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col',
          dir === 'rtl'
            ? 'right-0 rounded-l-3xl border-l border-[var(--app-border)]'
            : 'left-0 rounded-r-3xl border-r border-[var(--app-border)]',
          // Fix: Slide from Right (+100%) in RTL, Slide from Left (-100%) in LTR
          isMobileOpen ? 'translate-x-0' : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'),
          className
        )}
      >
        <div className="px-4 py-3.5 border-b border-[var(--app-border)] flex justify-between items-center bg-[var(--app-surface-hover)]/40">
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              النظاري ERP
            </span>
            <span className="text-[9px] font-bold text-[var(--app-text-secondary)]">القائمة الرئيسية</span>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="إغلاق القائمة"
            className="w-7 h-7 flex items-center justify-center text-[var(--app-text-secondary)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-all active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar" onClick={() => onCloseMobile()}>
          <SidebarNav isCollapsed={false} />
        </div>

        <div className="bg-[var(--app-surface-hover)]/30 border-t border-[var(--app-border)]/60">
          <SidebarFooter isCollapsed={false} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
