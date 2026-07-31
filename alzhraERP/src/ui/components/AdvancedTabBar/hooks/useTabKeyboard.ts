// ============================================
// useTabKeyboard — التنقل بلوحة المفاتيح + Typeahead
// ============================================
import { useCallback, MutableRefObject } from 'react';
import { TabItem } from '../types';

const isRTL = () =>
    document.documentElement.dir === 'rtl' ||
    document.documentElement.getAttribute('dir') === 'rtl';

interface UseTabKeyboardOptions {
    enabled: boolean;
    tabs: TabItem[];
    activeTab: string;
    tabRefs: MutableRefObject<{ [key: string]: HTMLButtonElement | null }>;
    onTabActivate: (tabId: string) => void;
}

export const useTabKeyboard = ({
    enabled,
    tabs,
    activeTab,
    tabRefs,
    onTabActivate,
}: UseTabKeyboardOptions) => {
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (!enabled) return;

        const { key } = event;
        const rtl = isRTL();
        const enabledTabs = tabs.filter(t => !t.disabled);
        const enabledIndex = enabledTabs.findIndex(t => t.id === activeTab);
        let newIndex = enabledIndex;

        switch (key) {
            case 'ArrowLeft':
                event.preventDefault();
                newIndex = rtl
                    ? (enabledIndex + 1) % enabledTabs.length
                    : (enabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
                break;

            case 'ArrowRight':
                event.preventDefault();
                newIndex = rtl
                    ? (enabledIndex - 1 + enabledTabs.length) % enabledTabs.length
                    : (enabledIndex + 1) % enabledTabs.length;
                break;

            case 'Home':
                event.preventDefault();
                newIndex = 0;
                break;

            case 'End':
                event.preventDefault();
                newIndex = enabledTabs.length - 1;
                break;

            case 'Enter':
            case ' ':
                event.preventDefault();
                onTabActivate(activeTab);
                return;

            default:
                // Typeahead: البحث بأول حرف
                if (key.length === 1 && /[a-zA-Z0-9\u0600-\u06FF]/.test(key)) {
                    const searchChar = key.toLowerCase();
                    const match = enabledTabs.find((tab, idx) => idx > enabledIndex && tab.label.toLowerCase().startsWith(searchChar))
                        || enabledTabs.find(tab => tab.label.toLowerCase().startsWith(searchChar));

                    if (match) {
                        newIndex = enabledTabs.findIndex(t => t.id === match.id);
                    } else return;
                } else return;
        }

        const targetTab = enabledTabs[newIndex];
        if (targetTab && targetTab.id !== activeTab) {
            onTabActivate(targetTab.id);
            setTimeout(() => tabRefs.current[targetTab.id]?.focus(), 0);
        }
    }, [enabled, tabs, activeTab, tabRefs, onTabActivate]);

    return { handleKeyDown };
};
