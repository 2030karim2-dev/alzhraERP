/**
 * Workspace Tab Bar — شريط تبويبات مساحة العمل المتعددة (Multi-Tab Workspace Bar).
 *
 * يحاكي أوراق عمل الإكسل وبرامج المحاسبة الاحترافية (Onyx Pro, SAP, BC)
 * ويتيح فتح شاشات متعددة والتنقل الفوري بينها مع حفظ البيانات.
 *
 * @module ui/layout/tabs/WorkspaceTabBar
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Plus, ChevronLeft, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { useWorkspaceTabStore, type WorkspaceTab } from '../../../core/store/workspaceTabStore';
import { getTabMeta, ICON_MAP, QUICK_LAUNCH_ITEMS } from './tabMeta';
import { WorkspaceTabContextMenu } from './WorkspaceTabContextMenu';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { cn } from '../../../core/utils';
import { prefetchRoute } from '../../../core/utils/routePrefetcher';

export const WorkspaceTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { dir } = useTranslation();
  const isRTL = dir === 'rtl';

  // ⚡ Selectors instead of a whole-store subscription: the tab bar no longer
  // re-renders when unrelated store slices change, and (more importantly) neither
  // does the MultiViewContainer that hosts every kept-alive page.
  const tabs = useWorkspaceTabStore(s => s.tabs);
  const activeTabId = useWorkspaceTabStore(s => s.activeTabId);
  const isEnabled = useWorkspaceTabStore(s => s.isEnabled);
  const openTab = useWorkspaceTabStore(s => s.openTab);
  const closeTab = useWorkspaceTabStore(s => s.closeTab);
  const closeOtherTabs = useWorkspaceTabStore(s => s.closeOtherTabs);
  const closeAllTabs = useWorkspaceTabStore(s => s.closeAllTabs);
  const setActiveTab = useWorkspaceTabStore(s => s.setActiveTab);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showQuickLaunch, setShowQuickLaunch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tab: WorkspaceTab;
  } | null>(null);

  // مزامنة الراوتر التلقائية: عند تغير مسار الرابط، نقوم بفتح أو تنشيط التبويب المطابق فوراً
  useEffect(() => {
    if (!isEnabled) return;
    const currentPath = location.pathname + location.search;
    const baseId = location.pathname;
    const meta = getTabMeta(location.pathname);

    openTab({
      id: baseId,
      path: currentPath,
      title: meta.title,
      iconKey: meta.iconKey,
      isClosable: baseId !== '/',
    });
  }, [location.pathname, location.search, isEnabled, openTab]);

  // التمرير التلقائي لجعل التبويب النشط مرئياً دائماً
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector(
      `[data-tab-id="${CSS.escape(activeTabId)}"]`
    );
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  // معالجة النقر على تبويب
  const handleTabClick = (tab: WorkspaceTab) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  // معالجة إغلاق التبويب
  const handleCloseTab = useCallback(
    (e: React.MouseEvent | null, tabId: string) => {
      if (e) {
        e.stopPropagation();
      }
      const nextPath = closeTab(tabId);
      if (nextPath) {
        navigate(nextPath);
      }
    },
    [closeTab, navigate]
  );

  // إغلاق بالنقر بالزر الأوسط (Middle Click)
  const handleMouseDown = (e: React.MouseEvent, tab: WorkspaceTab) => {
    if (e.button === 1 && tab.isClosable) {
      e.preventDefault();
      handleCloseTab(null, tab.id);
    }
  };

  // فتح القائمة بالزر الأيمن
  const handleContextMenu = (e: React.MouseEvent, tab: WorkspaceTab) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tab,
    });
  };

  // أزرار التمرير الأفقي
  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -200 : 200;
    scrollContainerRef.current.scrollBy({ left: isRTL ? -offset : offset, behavior: 'smooth' });
  };

  // اختصارات لوحة المفاتيح (Ctrl+W أو Alt+W للإغلاق، و Alt+Arrow للتنقل)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // إغلاق التبويب النشط الحالي عبر Alt + W أو Ctrl + W (إذا أتيح)
      if (
        (e.altKey && (e.key === 'w' || e.key === 'W' || e.key === 'ص')) ||
        (e.ctrlKey && !e.shiftKey && (e.key === 'w' || e.key === 'W'))
      ) {
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab?.isClosable) {
          e.preventDefault();
          handleCloseTab(null, activeTab.id);
        }
      }

      // التنقل بين التبويبات عبر Ctrl+Tab أو Alt+Left/Right
      if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        if (currentIndex >= 0) {
          const delta =
            (e.key === 'ArrowRight' && !isRTL) || (e.key === 'ArrowLeft' && isRTL) ? 1 : -1;
          const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
          const target = tabs[nextIndex];
          if (target) {
            e.preventDefault();
            handleTabClick(target);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabs, activeTabId, isRTL, handleCloseTab]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label="شريط شاشات العمل المفتوحة"
      className="no-print bg-[var(--app-surface)]/90 relative flex h-10 w-full select-none items-center border-b border-[var(--app-border)] px-2 backdrop-blur-md transition-colors"
      dir={dir}
    >
      {/* Scroll Left Button */}
      <button
        onClick={() => {
          handleScroll('left');
        }}
        aria-label="تمرير التبويبات لليمين"
        className="flex h-7 w-6 items-center justify-center rounded-md text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]"
      >
        <ChevronRight size={15} className={isRTL ? '' : 'rotate-180'} />
      </button>

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        className="custom-scrollbar-hide flex flex-1 items-center gap-1.5 overflow-x-auto scroll-smooth px-1 py-1"
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const IconComp = (tab.iconKey && ICON_MAP[tab.iconKey]) || Layers;

          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => {
                handleTabClick(tab);
              }}
              onMouseDown={e => {
                handleMouseDown(e, tab);
              }}
              onContextMenu={e => {
                handleContextMenu(e, tab);
              }}
              onMouseEnter={() => {
                prefetchRoute(tab.path);
              }}
              title={`${tab.title} (${tab.isClosable ? 'انقر بالزر الأوسط للإغلاق' : 'الرئيسية'})`}
              className={cn(
                'group relative flex h-8 min-w-[110px] max-w-[200px] cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-2.5 text-xs font-bold transition-all duration-150',
                isActive
                  ? 'z-10 -mb-[1px] border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--accent)] shadow-xs ring-1 ring-blue-500/20'
                  : 'border-transparent bg-transparent text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
              )}
            >
              {/* Active Tab Accent Top Line */}
              {isActive && (
                <div className="absolute left-1 right-1 top-0 h-[2px] rounded-full bg-blue-600 dark:bg-blue-400" />
              )}

              {/* Icon */}
              <IconComp
                size={14}
                className={cn(
                  'shrink-0 transition-transform group-hover:scale-105',
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-text-secondary)]'
                )}
              />

              {/* Title */}
              <span className="flex-1 truncate text-[11px] tracking-tight">{tab.title}</span>

              {/* Unsaved Changes Dot */}
              {tab.isDirty && (
                <span
                  title="توجد تعديلات غير محفوظة"
                  className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500"
                />
              )}

              {/* Close Button */}
              {tab.isClosable ? (
                <button
                  onClick={e => {
                    handleCloseTab(e, tab.id);
                  }}
                  aria-label={`إغلاق تبويب ${tab.title}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md p-0.5 text-[var(--app-text-secondary)] opacity-60 transition-all hover:bg-rose-500/15 hover:text-rose-600 hover:opacity-100 group-hover:opacity-90"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              ) : (
                <div className="w-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => {
          handleScroll('right');
        }}
        aria-label="تمرير التبويبات لليسار"
        className="flex h-7 w-6 items-center justify-center rounded-md text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]"
      >
        <ChevronLeft size={15} className={isRTL ? '' : 'rotate-180'} />
      </button>

      {/* Add New Tab (+) Quick Launch Button */}
      <div className="relative ms-1 shrink-0">
        <button
          onClick={() => {
            setShowQuickLaunch(!showQuickLaunch);
          }}
          aria-label="فتح شاشة جديدة في تبويب"
          title="فتح شاشة جديدة في تبويب (+)"
          className="shadow-2xs flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] transition-all hover:border-blue-500/40 hover:bg-blue-50/50 hover:text-blue-600 dark:hover:bg-blue-900/20"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>

        {/* Quick Launch Dropdown */}
        {showQuickLaunch && (
          <div
            className="animate-in fade-in-50 zoom-in-95 fixed z-[600] mt-1 w-56 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-2xl backdrop-blur-xl duration-150"
            style={{
              top: '84px',
              [isRTL ? 'left' : 'right']: '12px',
            }}
          >
            <div className="border-[var(--app-border)]/60 mb-1 flex items-center gap-1.5 border-b px-2 py-1 text-[11px] font-bold text-[var(--app-text-secondary)]">
              <Sparkles size={12} className="text-amber-500" />
              <span>فتح شاشة في تبويب جديد</span>
            </div>
            <div className="custom-scrollbar max-h-60 space-y-0.5 overflow-y-auto">
              {QUICK_LAUNCH_ITEMS.map(item => {
                const Icon = ICON_MAP[item.iconKey] || Layers;
                return (
                  <button
                    key={item.path}
                    onMouseEnter={() => {
                      prefetchRoute(item.path);
                    }}
                    onClick={() => {
                      openTab({
                        id: item.path,
                        path: item.path,
                        title: item.title,
                        iconKey: item.iconKey,
                        isClosable: true,
                      });
                      navigate(item.path);
                      setShowQuickLaunch(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
                  >
                    <Icon size={14} className="text-blue-500" />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <WorkspaceTabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tab={contextMenu.tab}
          isRTL={isRTL}
          onClose={() => {
            setContextMenu(null);
          }}
          onCloseTab={id => {
            handleCloseTab(null, id);
          }}
          onCloseOtherTabs={id => {
            const nextPath = closeOtherTabs(id);
            if (nextPath) navigate(nextPath);
          }}
          onCloseAllTabs={() => {
            const rootPath = closeAllTabs();
            navigate(rootPath);
          }}
          onRefreshTab={() => {
            // إعادة تحميل الرابط بدون فقدان التبويب
            navigate(contextMenu.tab.path);
          }}
        />
      )}
    </div>
  );
};
