/**
 * useGlobalShortcuts — Keyboard shortcut system for Alzhra ERP.
 *
 * Registers global keyboard shortcuts:
 * - Ctrl+K / Cmd+K: Open omni-search
 * - Ctrl+N: New record (context-aware)
 * - Ctrl+S: Save current form
 * - Ctrl+D: Duplicate current record
 * - Escape: Close modal/dropdown
 * - ?: Show shortcut cheat sheet (when NOT focused in input)
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
  /** Only fire when no input/textarea/editable is focused (default: true for safety) */
  globalOnly?: boolean;
  /** Description for the cheat sheet */
  description: string;
}

export interface UseGlobalShortcutsOptions {
  /** Array of shortcut bindings */
  shortcuts: ShortcutBinding[];
}

export const isInputFocused = (): boolean => {
  if (typeof document === 'undefined') return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  if (el.closest('input, textarea, select, [contenteditable="true"]')) return true;
  return false;
};

export const useGlobalShortcuts = ({ shortcuts }: UseGlobalShortcutsOptions): void => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // If an input is focused, never intercept regular keys unless explicitly allowed
    const inputActive = isInputFocused();

    for (const binding of shortcutsRef.current) {
      const needCtrl = !!binding.ctrl;
      const hasCtrl = e.ctrlKey || e.metaKey;
      if (needCtrl !== hasCtrl) continue;

      const needAlt = !!binding.alt;
      const hasAlt = e.altKey;
      if (needAlt !== hasAlt) continue;

      const needShift = !!binding.shift;
      const hasShift = e.shiftKey;
      if (needShift !== hasShift) continue;

      const keyMatch = e.key.toLowerCase() === binding.key.toLowerCase();
      if (!keyMatch) continue;

      // Default globalOnly to true if not explicitly false to protect typing
      const isGlobalOnly = binding.globalOnly !== false;
      if (isGlobalOnly && inputActive) continue;

      e.preventDefault();
      e.stopPropagation();
      binding.handler(e);
      return;
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
    key: 'k',
    ctrl: true,
    globalOnly: true,
    handler: handlers.onSearch,
    description: 'فتح البحث الشامل',
  },
  {
    key: 's',
    ctrl: true,
    globalOnly: true,
    handler: () => handlers.onSave?.(),
    description: 'حفظ',
  },
  {
    key: 'n',
    ctrl: true,
    globalOnly: true,
    handler: () => handlers.onNew?.(),
    description: 'جديد',
  },
  {
    key: 'd',
    ctrl: true,
    globalOnly: true,
    handler: () => handlers.onDuplicate?.(),
    description: 'تكرار',
  },
  {
    key: 'Escape',
    globalOnly: true,
    handler: () => handlers.onEscape?.(),
    description: 'إغلاق',
  },
  {
    key: '?',
    shift: true,
    globalOnly: true,
    handler: () => handlers.onHelp?.(),
    description: 'إظهار الاختصارات',
  },
];
