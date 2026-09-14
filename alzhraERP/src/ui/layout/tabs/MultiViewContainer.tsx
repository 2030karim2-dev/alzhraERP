/**
 * Multi-View Keep-Alive Container — حاوية الشاشات متعددة العرض.
 *
 * تضمن بقاء الشاشات المفتوحة حية في الذاكرة (Keep-Alive) عند التنقل بين التبويبات
 * تماماً مثل أوراق شيتات الإكسل، بحيث لا يتم تصفير الفواتير أو المدخلات أو مواضع التمرير.
 *
 * @module ui/layout/tabs/MultiViewContainer
 */

import React, { useRef, useEffect, useState } from 'react';
import { useOutlet } from 'react-router-dom';
import { useWorkspaceTabStore } from '../../../core/store/workspaceTabStore';
import { useBreakpoint } from '../../../lib/hooks/useBreakpoint';
import { ErrorBoundary } from '../../base/ErrorBoundary';
import PageLoader from '../../base/PageLoader';
import { cn } from '../../../core/utils';

export const MultiViewContainer: React.FC = () => {
  const outlet = useOutlet();
  const isDesktop = useBreakpoint('md');
  const { tabs, activeTabId, isEnabled } = useWorkspaceTabStore();

  // تخزين العناصر المعروضة لكل تبويب للحفاظ على الحالة حية بدون re-render زائد
  const viewsCacheRef = useRef<Record<string, React.ReactNode>>({});
  const [, forceUpdate] = useState({});

  // تحديث الكاش فوراً للشاشة الحالية
  if (activeTabId && outlet) {
    viewsCacheRef.current[activeTabId] = outlet;
  }

  // تنظيف الذاكرة للشاشات التي تم إغلاقها
  useEffect(() => {
    const currentTabIds = new Set(tabs.map(t => t.id));
    let cleaned = false;
    Object.keys(viewsCacheRef.current).forEach(id => {
      if (!currentTabIds.has(id)) {
        delete viewsCacheRef.current[id];
        cleaned = true;
      }
    });
    if (cleaned) {
      forceUpdate({});
    }
  }, [tabs]);

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
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        const viewContent = viewsCacheRef.current[tab.id] || (isActive ? outlet : null);

        // إذا لم يتم فتح هذه الشاشة بعد وليست نشطة، لا نحجز لها عناصر في الـ DOM
        if (!viewContent) return null;

        return (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
            role="tabpanel"
            aria-hidden={!isActive}
            className={cn('h-full w-full flex-1 flex-col', isActive ? 'flex' : 'hidden')}
            style={{ display: isActive ? 'flex' : 'none' }}
          >
            <ErrorBoundary>
              <React.Suspense fallback={<PageLoader />}>{viewContent}</React.Suspense>
            </ErrorBoundary>
          </div>
        );
      })}
    </div>
  );
};
