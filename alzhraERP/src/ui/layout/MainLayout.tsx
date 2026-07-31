import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { LayoutDashboard, ShoppingBag, Store, Wrench, WifiOff } from 'lucide-react';
import { ROUTES } from '../../core/routes/paths';
import { useI18nStore } from '../../lib/i18nStore';
import { useThemeStore } from '../../lib/themeStore';
import { ErrorBoundary } from '../base/ErrorBoundary';
import PageLoader from '../base/PageLoader';
import { cn } from '../../core/utils';
import { getBreakpointValue, useBreakpoint, useCurrentBreakpoint } from '../../lib/hooks/useBreakpoint';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useNetworkStatus } from '../../lib/hooks/useNetworkStatus';
import { useDevice } from '../../lib/hooks/useDevice';
import { useOrientation } from '../../lib/hooks/useOrientation';
import { getCollapsedSidebarWidth, getMainLayoutOffsetClasses, shouldPersistExpandedSidebar } from './sidebarSizing';
import { useConnectionStore } from '../../core/store/connectionStore';
import { Activity } from 'lucide-react';

const MainLayout: React.FC = () => {
  const isDesktop = useBreakpoint('md');
  const breakpoint = useCurrentBreakpoint();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    // On wide desktops (1920px+), sidebar starts expanded by default
    const width = window.innerWidth;
    if (width >= getBreakpointValue('3xl')) return false; // expanded
    return width >= getBreakpointValue('md'); // collapsed on tablet+
  });
  const previousIsDesktop = useRef(isDesktop);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isOnline } = useNetworkStatus();
  const { isUnstable } = useConnectionStore();
  const { deviceCategory, isIPad } = useDevice();
  const { isTabletLandscape, isTabletPortrait } = useOrientation();

  const { dir } = useI18nStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { initializeTheme } = useThemeStore();
  const { t } = useTranslation();

  // Dynamic sidebar width based on screen size and device
  const sidebarWidth = useMemo(() => getCollapsedSidebarWidth({
    breakpoint,
    isIPad,
    isTabletLandscape,
  }), [breakpoint, isIPad, isTabletLandscape]);

  // Dynamic content max-width for large screens — removed; handled by ContentContainer per-page
  const contentMaxWidth = useMemo(() => {
    return 'max-w-none px-0';
  }, []);

  // Padding bottom for main content (to account for mobile nav)
  const mainPaddingBottom = useMemo(() => {
    if (deviceCategory === 'phone') return 'pb-20';
    if (isIPad && isTabletPortrait) return 'pb-16';
    return 'pb-4';
  }, [deviceCategory, isIPad, isTabletPortrait]);

  useEffect(() => {
    if (previousIsDesktop.current !== isDesktop) {
      const isWide = shouldPersistExpandedSidebar(breakpoint);
      // On wide screens: expand; on smaller: collapse
      setIsSidebarCollapsed(isWide ? false : isDesktop);
      previousIsDesktop.current = isDesktop;
    }
  }, [isDesktop, breakpoint]);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // تحديث تلقائي للقائمة الجانبية في الموبايل عند تغيير المسار
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: LayoutDashboard, label: t('overview'), path: ROUTES.DASHBOARD.ROOT },
    { icon: Store, label: t('pos'), path: ROUTES.DASHBOARD.POS },
    { icon: ShoppingBag, label: t('invoices'), path: ROUTES.DASHBOARD.SALES },
    { icon: Wrench, label: t('products'), path: ROUTES.DASHBOARD.INVENTORY },
  ];

  return (
    <div data-theme-scope="app" className="h-screen bg-[var(--app-bg)] overflow-hidden font-sans" dir={dir}>
      {/* Network Alert Overlay */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-rose-500 z-[300] animate-pulse"></div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}

      <Sidebar
        className="no-print"
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        sidebarWidth={sidebarWidth}
      />

      <div className={cn(
        "flex-1 flex flex-col h-full overflow-hidden relative transition-[margin] duration-150 ease-out print:!m-0 print:!p-0 print:!w-full print:!overflow-visible print:!block",
        contentMaxWidth,
        isDesktop && getMainLayoutOffsetClasses({
          breakpoint,
          dir,
          isCollapsed: isSidebarCollapsed,
          isIPad,
          isTabletLandscape,
        })
      )}>
        <div className="no-print">
          <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        </div>

        {isOnline && isUnstable && (
          <div className="no-print bg-amber-500 text-white text-[9px] font-black py-1.5 flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg animate-in slide-in-from-top duration-500">
            <Activity size={11} className="animate-pulse" />
            <span>Connection unstable - Retrying background tasks</span>
          </div>
        )}

        {!isOnline && (
          <div className="no-print bg-rose-500 text-white text-[9px] font-black py-1.5 flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg animate-in slide-in-from-top duration-500">
            <WifiOff size={11} className="animate-bounce" />
            <span>Offline Mode Active - Performance optimized via Local Cache</span>
          </div>
        )}

        <main className={cn(
          "flex-1 overflow-y-auto custom-scrollbar relative print:!m-0 print:!p-0 print:!w-full print:!overflow-visible print:!block",
          mainPaddingBottom
        )}>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Tactical Mobile Navigation */}
        <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 bg-[var(--app-surface)]/95 backdrop-blur-md border-t-2 border-[var(--app-border)] h-16 flex items-center justify-around z-40 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 active:scale-90",
                  isActive ? "text-[var(--accent)]" : "text-[var(--app-text-secondary)]"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-500",
                  isActive ? "bg-[var(--accent)] text-white shadow-lg" : "hover:bg-[var(--app-surface-hover)]"
                )}>
                  <item.icon size={20} strokeWidth={isActive ? 3 : 2} />
                </div>
                <span className="text-[8px] font-semibold mt-1 uppercase tracking-widest leading-none">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MainLayout;
