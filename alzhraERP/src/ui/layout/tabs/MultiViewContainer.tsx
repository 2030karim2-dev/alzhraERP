/**
 * Multi-View Keep-Alive Container — حاوية الشاشات متعددة العرض.
 *
 * تضمن بقاء الشاشات المفتوحة حية في الذاكرة (Keep-Alive) عند التنقل بين التبويبات
 * تماماً مثل أوراق شيتات الإكسل، بحيث لا يتم تصفير الفواتير أو المدخلات أو مواضع التمرير.
 *
 * @module ui/layout/tabs/MultiViewContainer
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useOutlet } from 'react-router-dom';
import { useWorkspaceTabStore } from '../../../core/store/workspaceTabStore';
import { useBreakpoint } from '../../../lib/hooks/useBreakpoint';
import { ErrorBoundary } from '../../base/ErrorBoundary';
import PageLoader from '../../base/PageLoader';
import { cn } from '../../../core/utils';

/**
 * Maximum number of screens kept alive at once.
 *
 * Every kept-alive tab holds its React Query observers, timers, charts and DOM.
 * The previous unbounded cache let a long session reach the 15-tab limit, so a
 * single realtime invalidation refetched ALL of them and navigation became
 * progressively heavier. LRU eviction drops the least recently used tabs —
 * never a dirty one — and re-activating an evicted tab simply mounts it again
 * (its data is still in the React Query cache).
 */
const MAX_MOUNTED_TABS = 8;

/**
 * A tab is only evicted after being inactive for this long. No page currently
 * flags itself dirty (workspaceTabStore.setIsDirty is unused by screens), so the
 * time window is the practical safeguard against discarding in-progress input:
 * a tab the user was just working in is never the first to go.
 */
const EVICTION_IDLE_MS = 3 * 60 * 1000;

interface CacheEntry {
  view: React.ReactNode;
  lastUsed: number;
}

/**
 * Drops views of closed tabs and enforces the keep-alive budget.
 * Uses a Map (no dynamic object keys) and returns `true` when it changed the
 * cache so the caller can re-render.
 */
function pruneViewCache(
  cache: Map<string, CacheEntry>,
  openIds: Set<string>,
  dirtyIds: Set<string>,
  activeTabId: string
): boolean {
  let changed = false;

  for (const id of Array.from(cache.keys())) {
    if (!openIds.has(id)) {
      cache.delete(id);
      changed = true;
    }
  }

  if (cache.size <= MAX_MOUNTED_TABS) return changed;

  const now = Date.now();
  const evictable = Array.from(cache.entries())
    .filter(([id, entry]) => {
      const isOtherTab = id !== activeTabId;
      const isClean = !dirtyIds.has(id);
      const isIdle = now - entry.lastUsed > EVICTION_IDLE_MS;
      return isOtherTab && isClean && isIdle;
    })
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
    .slice(0, cache.size - MAX_MOUNTED_TABS);

  for (const [id] of evictable) {
    cache.delete(id);
    changed = true;
  }

  return changed;
}

interface TabPanelProps {
  tabId: string;
  isActive: boolean;
  children: React.ReactNode;
}

/** Memoized panel: hidden tabs must never re-render with the container. */
const TabPanel = React.memo(function TabPanel({ tabId, isActive, children }: TabPanelProps) {
  return (
    <div
      id={`tabpanel-${tabId.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
      role="tabpanel"
      aria-hidden={!isActive}
      className={cn('h-full w-full flex-1 flex-col', isActive ? 'flex' : 'hidden')}
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <ErrorBoundary>
        <React.Suspense fallback={<PageLoader />}>{children}</React.Suspense>
      </ErrorBoundary>
    </div>
  );
});

export const MultiViewContainer: React.FC = () => {
  const outlet = useOutlet();
  const isDesktop = useBreakpoint('md');

  // ⚡ Granular subscriptions. The previous single `useWorkspaceTabStore()` call
  // re-rendered this container on EVERY store write (tab title, dirty flag,
  // reorder) and therefore re-rendered every kept-alive page.
  const tabs = useWorkspaceTabStore(s => s.tabs);
  const activeTabId = useWorkspaceTabStore(s => s.activeTabId);
  const isEnabled = useWorkspaceTabStore(s => s.isEnabled);
  const tabsKey = useWorkspaceTabStore(s => s.tabs.map(t => t.id).join('|'));

  // تخزين العناصر المعروضة لكل تبويب للحفاظ على الحالة حية بدون re-render زائد
  const viewsCacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [, forceUpdate] = useState({});

  // ⚡ Cache the CURRENT outlet AFTER commit; writing to the cache during render is
  // unsafe under concurrent rendering / StrictMode double renders.
  useEffect(() => {
    if (activeTabId === '' || outlet === null || outlet === undefined) return;
    viewsCacheRef.current.set(activeTabId, { view: outlet, lastUsed: Date.now() });
  }, [activeTabId, outlet]);

  // تنظيف الذاكرة للشاشات المغلقة + فرض ميزانية keep-alive (LRU، ولا يُخلى تبويب غير محفوظ)
  useEffect(() => {
    const openIds = new Set(tabs.map(t => t.id));
    const dirtyIds = new Set(tabs.filter(t => t.isDirty === true).map(t => t.id));
    if (pruneViewCache(viewsCacheRef.current, openIds, dirtyIds, activeTabId)) {
      forceUpdate({});
    }
  }, [tabs, tabsKey, activeTabId]);

  const tabIds = useMemo(() => tabsKey.split('|').filter(Boolean), [tabsKey]);

  // في حال كان الجهاز هاتفاً أو تم تعطيل التبويبات، نستخدم العرض الفردي المباشر لحفظ الذاكرة
  if (!isDesktop || !isEnabled) {
    return (
      <ErrorBoundary>
        <React.Suspense fallback={<PageLoader />}>{outlet}</React.Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      {tabIds.map(tabId => {
        const isActive = tabId === activeTabId;
        const cached = viewsCacheRef.current.get(tabId);
        const viewContent = cached === undefined ? (isActive ? outlet : null) : cached.view;

        // إذا لم يتم فتح هذه الشاشة بعد وليست نشطة، لا نحجز لها عناصر في الـ DOM
        if (viewContent === null || viewContent === undefined) return null;

        return (
          <TabPanel key={tabId} tabId={tabId} isActive={isActive}>
            {viewContent}
          </TabPanel>
        );
      })}
    </div>
  );
};
