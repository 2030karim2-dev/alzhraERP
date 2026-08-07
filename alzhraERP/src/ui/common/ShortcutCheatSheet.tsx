import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { cn } from '../../core/utils';
import { ShortcutBinding } from '../../core/hooks/useGlobalShortcuts';

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
  isOpen, onClose, shortcuts, title = 'اختصارات لوحة المفاتيح',
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" />
      <div
        role="dialog" aria-modal="true" aria-label={title}
        onClick={e => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-md bg-[var(--app-surface)] rounded-2xl shadow-2xl border border-[var(--app-border)] overflow-hidden',
          'animate-in zoom-in-95 fade-in duration-200',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--app-text)]">{title}</h3>
          </div>
          <button onClick={onClose} aria-label="إغلاق"
            className="p-1.5 rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-1 max-h-[70dvh] overflow-y-auto custom-scrollbar">
          {shortcuts.map((binding, idx) => (
            <div key={idx}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--app-surface-hover)] transition-colors">
              <span className="text-xs font-medium text-[var(--app-text)]">{binding.description}</span>
              <kbd className="px-2 py-1 text-[10px] font-bold rounded-lg bg-[var(--app-bg)]
                border border-[var(--app-border)] text-[var(--app-text-secondary)] font-mono tracking-wide">
                {formatKey(binding)}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-[var(--app-border)] text-center">
          <p className="text-[10px] font-semibold text-[var(--app-text-secondary)]">
            اضغط <kbd className="px-1 py-0.5 rounded bg-[var(--app-bg)] border border-[var(--app-border)] text-[10px] font-bold mx-0.5">?</kbd> في أي وقت لإظهار هذه القائمة
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutCheatSheet;
