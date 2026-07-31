// ============================================
// useTabDragDrop — منطق السحب والإفلات بين التابات
// ============================================
import { useState, useCallback, MutableRefObject } from 'react';
import { TabItem } from '../types';

export interface DragState {
    isDragging: boolean;
    draggedTabId: string | null;
    dropTargetId: string | null;
    originalIndex: number;
    dragOffset: { x: number; y: number };
}

const INITIAL_DRAG_STATE: DragState = {
    isDragging: false,
    draggedTabId: null,
    dropTargetId: null,
    originalIndex: -1,
    dragOffset: { x: 0, y: 0 },
};

interface UseTabDragDropOptions {
    enabled: boolean;
    tabs: TabItem[];
    setTabs: (tabs: TabItem[]) => void;
    onTabsReorder?: (tabs: TabItem[]) => void;
    tabRefs: MutableRefObject<{ [key: string]: HTMLButtonElement | null }>;
    announceChange: (msg: string) => void;
}

export const useTabDragDrop = ({
    enabled,
    tabs,
    setTabs,
    onTabsReorder,
    tabRefs,
    announceChange,
}: UseTabDragDropOptions) => {
    const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);

    const handleDragStart = useCallback((event: React.DragEvent, tabId: string) => {
        if (!enabled) return;
        const index = tabs.findIndex(t => t.id === tabId);
        setDragState({ isDragging: true, draggedTabId: tabId, dropTargetId: null, originalIndex: index, dragOffset: { x: 0, y: 0 } });

        const el = tabRefs.current[tabId];
        if (el) {
            const rect = el.getBoundingClientRect();
            event.dataTransfer.setDragImage(el, rect.width / 2, rect.height / 2);
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', tabId);
    }, [enabled, tabs, tabRefs]);

    const handleDragEnd = useCallback((_event: React.DragEvent) => {
        if (!enabled) return;
        setDragState(INITIAL_DRAG_STATE);
    }, [enabled]);

    const handleDragOver = useCallback((event: React.DragEvent, tabId: string) => {
        if (!enabled || !dragState.isDragging) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (tabId !== dragState.draggedTabId && tabId !== dragState.dropTargetId) {
            setDragState(prev => ({ ...prev, dropTargetId: tabId }));
        }
    }, [enabled, dragState.isDragging, dragState.draggedTabId, dragState.dropTargetId]);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
        if (!enabled) return;
        const relatedTarget = event.relatedTarget as HTMLElement;
        const currentTarget = event.currentTarget as HTMLElement;
        if (!currentTarget.contains(relatedTarget)) {
            setDragState(prev => ({ ...prev, dropTargetId: null }));
        }
    }, [enabled]);

    const handleDrop = useCallback((event: React.DragEvent, targetTabId: string) => {
        if (!enabled || !dragState.isDragging || !dragState.draggedTabId) return;
        event.preventDefault();

        const draggedId = dragState.draggedTabId;
        if (draggedId !== targetTabId) {
            const newTabs = [...tabs];
            const draggedIndex = newTabs.findIndex(t => t.id === draggedId);
            const targetIndex = newTabs.findIndex(t => t.id === targetTabId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [removed] = newTabs.splice(draggedIndex, 1);
                newTabs.splice(targetIndex, 0, removed);
                setTabs(newTabs);
                onTabsReorder?.(newTabs);
                announceChange(`Tab moved to position ${targetIndex + 1}`);
            }
        }
        setDragState(INITIAL_DRAG_STATE);
    }, [enabled, dragState, tabs, setTabs, onTabsReorder, announceChange]);

    return { dragState, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop };
};
