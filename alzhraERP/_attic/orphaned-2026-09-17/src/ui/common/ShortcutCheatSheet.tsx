import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { cn } from '../../core/utils';
import type { ShortcutBinding } from '../../core/hooks/useGlobalShortcuts';

interface ShortcutCheatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutBinding[];
  title?: string;
}

const formatKey = (binding: ShortcutBinding): string => {
  const parts: string[] = [];
  if (binding.ctrl) parts.push('Ctrl');
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  parts.push(binding.key === '?' ? '?' : binding.key.toUpperCase());
  return parts.join(' + ');
};

const ShortcutCheatSheet: React.FC<ShortcutCheatSheetProps> = ({
  isOpen,
  onClose,
  shortcuts,
  title = 'اختصارات لوحة المفاتيح',
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => {
          e.stopPropagation();
        }}
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl',
          'animate-in zoom-in-95 fade-in duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--app-text)]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="custom-scrollbar max-h-[70dvh] space-y-1 overflow-y-auto p-4">
          {shortcuts.map((binding, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--app-surface-hover)]"
            >
              <span className="text-xs font-medium text-[var(--app-text)]">
                {binding.description}
              </span>
              <kbd className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-[var(--app-text-secondary)]">
                {formatKey(binding)}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-[var(--app-border)] px-5 py-3 text-center">
          <p className="text-[10px] font-semibold text-[var(--app-text-secondary)]">
            اضغط{' '}
            <kbd className="mx-0.5 rounded border border-[var(--app-border)] bg-[var(--app-bg)] px-1 py-0.5 text-[10px] font-bold">
              ?
            </kbd>{' '}
            في أي وقت لإظهار هذه القائمة
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutCheatSheet;
