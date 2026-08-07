/**
 * useGlobalShortcuts — Keyboard shortcut system for Alzhra ERP.
 * 
 * Registers global keyboard shortcuts:
 * - Ctrl+K / Cmd+K: Open omni-search
 * - Ctrl+N: New record (context-aware)
 * - Ctrl+S: Save current form
 * - Ctrl+D: Duplicate current record
 * - Escape: Close modal/dropdown
 * - ?: Show shortcut cheat sheet
 * 
 * @module core/hooks/useGlobalShortcuts
 */

import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutBinding {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: (e: KeyboardEvent) => void;
  /** Only fire when no input/textarea is focused */
  globalOnly?: boolean;
  /** Description for the cheat sheet */
  description: string;
}

export interface UseGlobalShortcutsOptions {
  /** Array of shortcut bindings */
  shortcuts: ShortcutBinding[];
}

const isInputFocused = (): boolean => {
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === '[contenteditable="true"]';
};

export const useGlobalShortcuts = ({ shortcuts }: UseGlobalShortcutsOptions): void => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const binding of shortcutsRef.current) {
      const ctrlOk = binding.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const altOk = binding.alt ? e.altKey : true;
      const shiftOk = binding.shift ? e.shiftKey : true;
      const keyMatch = e.key.toLowerCase() === binding.key.toLowerCase();

      if (keyMatch && ctrlOk && altOk && shiftOk) {
        // Skip if input is focused and shortcut is global-only
        if (binding.globalOnly && isInputFocused()) continue;

        e.preventDefault();
        e.stopPropagation();
        binding.handler(e);
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

/**
 * Pre-built common shortcut presets.
 * Usage: useGlobalShortcuts({ shortcuts: COMMON_SHORTCUTS({ onSearch, onNew, onSave }) })
 */
export const COMMON_SHORTCUTS = (handlers: {
  onSearch: () => void;
  onSave?: () => void;
  onNew?: () => void;
  onDuplicate?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
}): ShortcutBinding[] => [
  {
    key: 'k', ctrl: true, globalOnly: true,
    handler: handlers.onSearch,
    description: 'فتح البحث الشامل',
  },
  {
    key: 's', ctrl: true, globalOnly: true,
    handler: () => handlers.onSave?.(),
    description: 'حفظ',
  },
  {
    key: 'n', ctrl: true, globalOnly: true,
    handler: () => handlers.onNew?.(),
    description: 'جديد',
  },
  {
    key: 'd', ctrl: true, globalOnly: true,
    handler: () => handlers.onDuplicate?.(),
    description: 'تكرار',
  },
  {
    key: 'Escape', globalOnly: true,
    handler: () => handlers.onEscape?.(),
    description: 'إغلاق',
  },
  {
    key: '?', shift: true,
    handler: () => handlers.onHelp?.(),
    description: 'إظهار الاختصارات',
  },
];
