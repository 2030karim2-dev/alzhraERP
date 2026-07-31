// ============================================
// useAdvancedTabs — Orchestrator Hook
// تم التقسيم:
//   - منطق الـ Indicator  → hooks/useTabIndicator.ts
//   - منطق Drag & Drop   → hooks/useTabDragDrop.ts
//   - منطق لوحة المفاتيح  → hooks/useTabKeyboard.ts
// ============================================

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
    TabItem, AnimationConfig, GradientConfig, A11yConfig,
    DEFAULT_ANIMATION_CONFIG, DEFAULT_LIGHT_GRADIENT, DEFAULT_DARK_GRADIENT, DEFAULT_A11Y_CONFIG
} from './types';
import { useTabIndicator } from './hooks/useTabIndicator';
import { useTabDragDrop } from './hooks/useTabDragDrop';
import { useTabKeyboard } from './hooks/useTabKeyboard';

// ── Types ────────────────────────────────────────────────
interface TabRefs { [key: string]: HTMLButtonElement | null; }

interface UseAdvancedTabsProps {
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    onTabsReorder?: ((tabs: TabItem[]) => void) | undefined;
    animation?: Partial<AnimationConfig>;
    gradient?: Partial<GradientConfig>;
    a11y?: Partial<A11yConfig>;
    enableDragDrop?: boolean;
    enableKeyboardNav?: boolean;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'sm' | 'md' | 'lg';
    enable3D?: boolean;
}

// ── Utility: اكتشاف ثيم النظام ───────────────────────────
const useSystemTheme = (): 'light' | 'dark' => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mq.matches ? 'dark' : 'light');
        const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return theme;
};

// ── Utility: إعلان قارئ الشاشة ───────────────────────────
const announceToScreenReader = (message: string): void => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    el.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => document.body.removeChild(el), 1000);
};

// ── Main Hook ────────────────────────────────────────────
export const useAdvancedTabs = ({
    tabs: initialTabs,
    activeTab,
    onTabChange,
    onTabsReorder,
    animation = {},
    gradient = {},
    a11y = {},
    enableDragDrop = false,
    enableKeyboardNav = true,
    theme = 'auto',
}: UseAdvancedTabsProps) => {
    const [tabs, setTabs] = useState<TabItem[]>(initialTabs);
    const [focusedTabId, setFocusedTabId] = useState<string | null>(null);
    const [keyboardIsTabbing, setKeyboardIsTabbing] = useState(false);

    const tabRefs = useRef<TabRefs>({});
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external tabs prop → internal state with structural comparison to prevent inline array reference re-renders
    const prevTabsRef = useRef<TabItem[]>(initialTabs);
    useEffect(() => {
        const hasChanged =
            initialTabs.length !== prevTabsRef.current.length ||
            initialTabs.some((tab, i) => {
                const prevTab = prevTabsRef.current[i];
                return !prevTab ||
                    tab.id !== prevTab.id ||
                    tab.label !== prevTab.label ||
                    tab.disabled !== prevTab.disabled ||
                    tab.icon !== prevTab.icon;
            });

        if (hasChanged) {
            prevTabsRef.current = initialTabs;
            setTabs(initialTabs);
        }
    }, [initialTabs]);

    // ── Config ─────────────────────────────────────────────
    const systemTheme = useSystemTheme();
    const currentTheme = theme === 'auto' ? systemTheme : theme;

    const animationConfig = useMemo(() => ({ ...DEFAULT_ANIMATION_CONFIG, ...animation }), [animation]);
    const gradientConfig = useMemo(() => ({
        ...(currentTheme === 'dark' ? DEFAULT_DARK_GRADIENT : DEFAULT_LIGHT_GRADIENT),
        ...gradient,
    }), [currentTheme, gradient]);
    const a11yConfig = useMemo(() => ({ ...DEFAULT_A11Y_CONFIG, ...a11y }), [a11y]);

    // ── Tab Click ──────────────────────────────────────────
    const handleTabClick = useCallback((tabId: string) => {
        if (tabId === activeTab) return;
        const tab = tabs.find(t => t.id === tabId);
        if (tab?.disabled) return;
        onTabChange(tabId);
        if (a11yConfig.announceChanges && a11yConfig.announcementFormatter) {
            announceToScreenReader(a11yConfig.announcementFormatter(tab?.label || tabId));
        }
    }, [activeTab, tabs, onTabChange, a11yConfig]);

    // ── Focus Handlers ─────────────────────────────────────
    const handleTabFocus = useCallback((tabId: string) => {
        setFocusedTabId(tabId);
        setKeyboardIsTabbing(true);
    }, []);
    const handleTabBlur = useCallback(() => {
        setFocusedTabId(null);
        setKeyboardIsTabbing(false);
    }, []);

    // ── Delegated Hooks ────────────────────────────────────
    const { indicatorPosition } = useTabIndicator({ activeTab, tabRefs, containerRef });

    const { dragState, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop } = useTabDragDrop({
        enabled: enableDragDrop,
        tabs,
        setTabs,
        onTabsReorder: onTabsReorder as (tabs: TabItem[]) => void,
        tabRefs,
        announceChange: announceToScreenReader,
    });

    const { handleKeyDown } = useTabKeyboard({
        enabled: enableKeyboardNav,
        tabs,
        activeTab,
        tabRefs,
        onTabActivate: handleTabClick,
    });

    // ── Ref Setter ─────────────────────────────────────────
    const setTabRef = useCallback((tabId: string) =>
        (el: HTMLButtonElement | null) => { tabRefs.current[tabId] = el; },
    []);

    // ── ARIA Attributes ────────────────────────────────────
    const getTabAttributes = useCallback((tabId: string, _index: number) => {
        const tab = tabs.find(t => t.id === tabId);
        const isActive = tabId === activeTab;
        const isFocused = tabId === focusedTabId;
        return {
            role: 'tab' as const,
            'aria-selected': isActive,
            'aria-disabled': tab?.disabled,
            'aria-controls': `tabpanel-${tabId}`,
            'aria-label': tab?.tooltip,
            tabIndex: isActive || (isFocused && keyboardIsTabbing) ? 0 : -1,
        };
    }, [tabs, activeTab, focusedTabId, keyboardIsTabbing]);

    // ── Return ─────────────────────────────────────────────
    return {
        tabs,
        activeTabId: activeTab,
        focusedTabId,
        dragState,
        indicatorPosition,
        tabRefs,
        containerRef,
        handleTabClick,
        handleTabMouseEnter: useCallback((_tabId: string) => { }, []),
        handleTabMouseLeave: useCallback(() => { }, []),
        handleTabFocus,
        handleTabBlur,
        handleKeyDown,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        setTabRef,
        animationConfig,
        gradientConfig,
        a11yConfig,
        getTabAttributes,
    };
};

export default useAdvancedTabs;
