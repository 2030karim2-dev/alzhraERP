import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Wrench,
  WifiOff,
  Ellipsis,
  Users,
  Truck,
  BarChart3,
  Settings,
  ReceiptText,
  PackageOpen,
  DollarSign,
  Calculator,
  CalendarDays,
} from 'lucide-react';
import { ROUTES } from '../../core/routes/paths';
import { useI18nStore } from '../../lib/i18nStore';
import { useThemeStore } from '../../lib/themeStore';
import { ErrorBoundary } from '../base/ErrorBoundary';
import PageLoader from '../base/PageLoader';
import BottomSheet from '../base/BottomSheet';
import { cn } from '../../core/utils';
import {
  getBreakpointValue,
  useBreakpoint,
  useCurrentBreakpoint,
} from '../../lib/hooks/useBreakpoint';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useNetworkStatus } from '../../lib/hooks/useNetworkStatus';
import { useDevice } from '../../lib/hooks/useDevice';
import { useOrientation } from '../../lib/hooks/useOrientation';
import {
  getCollapsedSidebarWidth,
  getMainLayoutOffsetClasses,
  shouldPersistExpandedSidebar,
} from './sidebarSizing';
import { useConnectionStore } from '../../core/store/connectionStore';
import { Activity, SlidersHorizontal, Link2 } from 'lucide-react';

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
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
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
  const sidebarWidth = useMemo(
    () =>
      getCollapsedSidebarWidth({
        breakpoint,
        isIPad,
        isTabletLandscape,
      }),
    [breakpoint, isIPad, isTabletLandscape]
  );

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
    { icon: Calculator, label: t('commission_dashboard'), path: ROUTES.DASHBOARD.COMMISSIONS },
  ];

  const moreItems = [
    { icon: BarChart3, label: t('reports'), path: '/reports' },
    { icon: Users, label: t('customers'), path: '/parties' },
    { icon: Truck, label: t('purchases'), path: '/purchases' },
    { icon: ReceiptText, label: t('expenses'), path: '/expenses' },
    { icon: DollarSign, label: t('accounting'), path: '/accounting' },
    { icon: Calculator, label: t('commission_dashboard'), path: ROUTES.DASHBOARD.COMMISSIONS },
    {
      icon: SlidersHorizontal,
      label: t('commission_config'),
      path: ROUTES.DASHBOARD.COMMISSIONS_CONFIG,
    },
    { icon: Link2, label: t('commission_assignments'), path: ROUTES.DASHBOARD.COMMISSIONS_ASSIGNMENTS },
    { icon: CalendarDays, label: t('commission_periods'), path: ROUTES.DASHBOARD.COMMISSIONS_PERIODS },
    { icon: BarChart3, label: t('commission_reports'), path: ROUTES.DASHBOARD.COMMISSIONS_REPORTS },
    { icon: PackageOpen, label: t('inventory'), path: '/inventory' },
    { icon: Settings, label: t('settings'), path: '/settings' },
  ];

  return (
    <div
      data-theme-scope="app"
      className="h-[100dvh] overflow-hidden bg-[var(--app-bg)] font-sans"
      dir={dir}
    >
      {/* Network Alert Overlay */}
      {!isOnline && (
        <div className="fixed left-0 right-0 top-0 z-[300] h-1 animate-pulse bg-rose-500"></div>
      )}

      {/* Skip to Content — Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[400] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg"
      >
        {t('skip_to_content') || 'تخطي إلى المحتوى'}
      </a>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="bg-[var(--app-text)]/60 animate-in fade-in fixed inset-0 z-50 backdrop-blur-sm duration-300 md:hidden"
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

      <div
        className={cn(
          'relative flex h-full flex-1 flex-col overflow-hidden transition-[margin] duration-150 ease-out print:!m-0 print:!block print:!w-full print:!overflow-visible print:!p-0',
          contentMaxWidth,
          isDesktop &&
            getMainLayoutOffsetClasses({
              breakpoint,
              dir,
              isCollapsed: isSidebarCollapsed,
              isIPad,
              isTabletLandscape,
            })
        )}
      >
        <div className="no-print">
          <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        </div>

        {isOnline && isUnstable && (
          <div className="no-print animate-in slide-in-from-top flex items-center justify-center gap-2 bg-amber-500 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg duration-500">
            <Activity size={11} className="animate-pulse" />
            <span>Connection unstable - Retrying background tasks</span>
          </div>
        )}

        {!isOnline && (
          <div className="no-print animate-in slide-in-from-top flex items-center justify-center gap-2 bg-rose-500 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg duration-500">
            <WifiOff size={11} className="animate-bounce" />
            <span>Offline Mode Active - Performance optimized via Local Cache</span>
          </div>
        )}

        <main
          id="main-content"
          className={cn(
            'custom-scrollbar relative flex-1 overflow-y-auto print:!m-0 print:!block print:!w-full print:!overflow-visible print:!p-0',
            mainPaddingBottom
          )}
        >
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Tactical Mobile Navigation */}
        <nav
          role="navigation"
          aria-label={t('mobile_navigation') || 'التنقل السفلي'}
          className="no-print bg-[var(--app-surface)]/95 fixed bottom-0 left-0 right-0 z-40 flex h-14 max-md:h-[3.5rem] items-center justify-around border-t-2 border-[var(--app-border)] px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-md md:hidden"
        >
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                className={cn(
                  'flex h-full flex-1 flex-col items-center justify-center transition-all duration-300 active:scale-90',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--app-text-secondary)]'
                )}
              >
                <div
                  className={cn(
                    'rounded-xl p-1.5 max-md:p-1 transition-all duration-500',
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-lg'
                      : 'hover:bg-[var(--app-surface-hover)]'
                  )}
                >
                  <item.icon size={18} strokeWidth={isActive ? 3 : 2} />
                </div>
                <span className="mt-0.5 text-[8px] max-md:text-[7px] font-semibold uppercase leading-none tracking-widest">
                  {item.label}
                </span>
              </button>
            );
          })}
          {/* More Button */}
          <button
            onClick={() => setIsMoreSheetOpen(true)}
            aria-label={t('more') || 'المزيد'}
            className={cn(
              'flex h-full flex-1 flex-col items-center justify-center transition-all duration-300 active:scale-90',
              isMoreSheetOpen ? 'text-[var(--accent)]' : 'text-[var(--app-text-secondary)]'
            )}
          >
            <div
              className={cn(
                'rounded-xl p-1.5 max-md:p-1 transition-all duration-500',
                isMoreSheetOpen
                  ? 'bg-[var(--accent)] text-white shadow-lg'
                  : 'hover:bg-[var(--app-surface-hover)]'
              )}
            >
              <Ellipsis size={18} strokeWidth={2} />
            </div>
            <span className="mt-0.5 text-[8px] max-md:text-[7px] font-semibold uppercase leading-none tracking-widest">
              {t('more') || 'المزيد'}
            </span>
          </button>
        </nav>

        {/* More Actions BottomSheet */}
        <BottomSheet
          isOpen={isMoreSheetOpen}
          onClose={() => setIsMoreSheetOpen(false)}
          title={t('quick_actions') || 'إجراءات سريعة'}
        >
          <div className="grid grid-cols-3 gap-3 max-md:gap-2">
            {moreItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMoreSheetOpen(false);
                  }}
                  aria-label={item.label}
                  className={cn(
                    'flex flex-col items-center gap-2 max-md:gap-1.5 rounded-2xl p-4 max-md:p-2.5 transition-all duration-200 active:scale-95',
                    isActive
                      ? 'bg-[var(--accent)]/10 ring-[var(--accent)]/30 text-[var(--accent)] ring-2'
                      : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-xl p-3 max-md:p-2 transition-all',
                      isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--app-surface)]'
                    )}
                  >
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                  </div>
                  <span className="text-center text-[10px] font-bold leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </BottomSheet>
      </div>
    </div>
  );
};

export default MainLayout;
