/**
 * Workspace Tab Store — إدارة مساحة العمل متعددة التبويبات (Multi-Tab Workspace).
 *
 * يسمح بفتح عدة شاشات في نفس الوقت والتنقل السريع بينها دون فقدان البيانات
 * مثل برامج المحاسبة المكتبية (Onyx Pro, SAP, Excel).
 *
 * @module core/store/workspaceTabStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkspaceTab {
  /** معرف فريد للتبويب (عادة ما يكون مسار الشاشة الأساسي مثل '/' أو '/sales') */
  id: string;
  /** المسار الكامل متضمناً معلمات البحث query params */
  path: string;
  /** العنوان المعروض للتبويب بالعربية */
  title: string;
  /** مفتاح الأيقونة المعروضة */
  iconKey?: string | undefined;
  /** هل التبويب قابل للإغلاق؟ (الرئيسية '/' غير قابلة للإغلاق افتراضياً) */
  isClosable: boolean;
  /** هل يحتوي التبويب على مدخلات أو تعديلات غير محفوظة؟ */
  isDirty?: boolean | undefined;
}

export const DEFAULT_ROOT_TAB: WorkspaceTab = {
  id: '/',
  path: '/',
  title: 'الرئيسية',
  iconKey: 'LayoutDashboard',
  isClosable: false,
};

export const MAX_TABS_LIMIT = 15;

interface WorkspaceTabState {
  /** قائمة التبويبات المفتوحة حالياً */
  tabs: WorkspaceTab[];
  /** معرف التبويب النشط حالياً */
  activeTabId: string;
  /** هل نظام التبويبات المتعددة مفعل؟ */
  isEnabled: boolean;

  /** فتح تبويب جديد أو تنشيطه إذا كان مفتوحاً بالفعل */
  openTab: (tab: Omit<WorkspaceTab, 'isClosable'> & { isClosable?: boolean }) => void;
  /** إغلاق تبويب محدد وإرجاع مسار التبويب البديل لتوجيه الراوتر إليه */
  closeTab: (tabId: string) => string | null;
  /** إغلاق كافة التبويبات الأخرى والإبقاء على التبويب المحدد والرئيسية */
  closeOtherTabs: (keepTabId: string) => string | null;
  /** إغلاق جميع التبويبات والعودة للرئيسية */
  closeAllTabs: () => string;
  /** تنشيط تبويب معين */
  setActiveTab: (tabId: string) => void;
  /** تحديث مؤشر التعديلات غير المحفوظة */
  setIsDirty: (tabId: string, isDirty: boolean) => void;
  /** تحديث عنوان التبويب (مثلاً عند فتح فاتورة محددة وعرض رقمها) */
  updateTabTitle: (tabId: string, title: string) => void;
  /** إعادة ترتيب التبويبات (سحب وإفلات) */
  reorderTabs: (newTabs: WorkspaceTab[]) => void;
  /** تفعيل أو تعطيل ميزة التبويبات المتعددة */
  setEnabled: (enabled: boolean) => void;
}

export const useWorkspaceTabStore = create<WorkspaceTabState>()(
  persist(
    (set, get) => ({
      tabs: [DEFAULT_ROOT_TAB],
      activeTabId: DEFAULT_ROOT_TAB.id,
      isEnabled: true,

      openTab: newTab => {
        const { tabs, activeTabId } = get();
        const tabId = newTab.id || newTab.path;
        const existingIndex = tabs.findIndex(t => t.id === tabId);

        if (existingIndex >= 0) {
          // التبويب موجود بالفعل: نقوم بتحديث المسار في حال تغيرت معلمات البحث وتنشيطه
          const updatedTabs = [...tabs];
          updatedTabs[existingIndex] = {
            ...updatedTabs[existingIndex],
            path: newTab.path,
            title: newTab.title || updatedTabs[existingIndex].title,
            iconKey: newTab.iconKey || updatedTabs[existingIndex].iconKey,
          };
          set({
            tabs: updatedTabs,
            activeTabId: tabId,
          });
          return;
        }

        // إنشاء تبويب جديد
        const isClosable = newTab.isClosable ?? tabId !== '/';
        const tabToInsert: WorkspaceTab = {
          id: tabId,
          path: newTab.path,
          title: newTab.title || 'شاشة جديدة',
          iconKey: newTab.iconKey,
          isClosable,
          isDirty: false,
        };

        // إدارة الحد الأقصى للتبويبات لمنع استهلاك الذاكرة
        const nextTabs = [...tabs];
        if (nextTabs.length >= MAX_TABS_LIMIT) {
          // إغلاق أقدم تبويب قابل للإغلاق ليس نشطاً
          const oldestClosableIndex = nextTabs.findIndex(t => t.isClosable && t.id !== activeTabId);
          if (oldestClosableIndex >= 0) {
            nextTabs.splice(oldestClosableIndex, 1);
          }
        }

        nextTabs.push(tabToInsert);
        set({
          tabs: nextTabs,
          activeTabId: tabId,
        });
      },

      closeTab: tabId => {
        const { tabs, activeTabId } = get();
        const tabToClose = tabs.find(t => t.id === tabId);

        // لا يمكن إغلاق التبويبات غير القابلة للإغلاق كالرئيسية
        if (!tabToClose?.isClosable) {
          return null;
        }

        const tabIndex = tabs.findIndex(t => t.id === tabId);
        const filteredTabs = tabs.filter(t => t.id !== tabId);

        let nextActivePath: string | null = null;

        // إذا أغلق المستخدم التبويب النشط حالياً، يجب تنشيط التبويب الأقرب
        if (activeTabId === tabId) {
          const nextTab =
            tabIndex > 0 ? filteredTabs[tabIndex - 1] : filteredTabs[0] || DEFAULT_ROOT_TAB;
          set({
            tabs: filteredTabs,
            activeTabId: nextTab.id,
          });
          nextActivePath = nextTab.path;
        } else {
          set({ tabs: filteredTabs });
        }

        return nextActivePath;
      },

      closeOtherTabs: keepTabId => {
        const { tabs } = get();
        const targetTab = tabs.find(t => t.id === keepTabId);
        if (!targetTab) return null;

        // نحتفظ فقط بالرئيسية والتبويب المطلوب
        const preserved = tabs.filter(t => !t.isClosable || t.id === keepTabId);
        set({
          tabs: preserved,
          activeTabId: keepTabId,
        });
        return targetTab.path;
      },

      closeAllTabs: () => {
        const preserved = [DEFAULT_ROOT_TAB];
        set({
          tabs: preserved,
          activeTabId: DEFAULT_ROOT_TAB.id,
        });
        return DEFAULT_ROOT_TAB.path;
      },

      setActiveTab: tabId => {
        const { tabs } = get();
        if (tabs.some(t => t.id === tabId)) {
          set({ activeTabId: tabId });
        }
      },

      setIsDirty: (tabId, isDirty) => {
        set(state => ({
          tabs: state.tabs.map(t => (t.id === tabId ? { ...t, isDirty } : t)),
        }));
      },

      updateTabTitle: (tabId, title) => {
        set(state => ({
          tabs: state.tabs.map(t => (t.id === tabId ? { ...t, title } : t)),
        }));
      },

      reorderTabs: newTabs => {
        set({ tabs: newTabs });
      },

      setEnabled: enabled => {
        set({ isEnabled: enabled });
      },
    }),
    {
      name: 'alzhra-workspace-tabs',
      partialize: state => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        isEnabled: state.isEnabled,
      }),
      merge: (persisted: unknown, current: WorkspaceTabState): WorkspaceTabState => {
        const p = persisted as Partial<WorkspaceTabState> | null;
        const persistedTabs = Array.isArray(p?.tabs) && p.tabs.length > 0 ? p.tabs : current.tabs;
        // التأكد من أن التبويب الرئيسي موجود دائماً وغير قابل للإغلاق
        const hasRoot = persistedTabs.some(t => t.id === '/');
        const finalTabs = hasRoot
          ? persistedTabs.map(t => (t.id === '/' ? { ...t, isClosable: false } : t))
          : [DEFAULT_ROOT_TAB, ...persistedTabs];

        const activeId =
          p?.activeTabId && finalTabs.some(t => t.id === p.activeTabId)
            ? p.activeTabId
            : finalTabs[0].id;

        return {
          ...current,
          tabs: finalTabs,
          activeTabId: activeId,
          isEnabled: p?.isEnabled ?? current.isEnabled,
        };
      },
    }
  )
);
