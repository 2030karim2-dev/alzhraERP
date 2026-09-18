import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  searchTerm: string;
  activeMatchIndex: number;
  totalMatches: number;
  onSearchChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export const ChatSearchOverlay: React.FC<Props> = ({
  isOpen,
  searchTerm,
  activeMatchIndex,
  totalMatches,
  onSearchChange,
  onNext,
  onPrev,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="animate-in slide-in-from-top flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 shadow-sm duration-200">
      <Search size={16} className="text-[var(--app-text-secondary)]" />

      <input
        ref={inputRef}
        type="text"
        placeholder="بحث في الرسائل..."
        value={searchTerm}
        onChange={e => {
          onSearchChange(e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
        className="flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1 text-xs text-[var(--app-text)] placeholder-[var(--app-text-secondary)] outline-none focus:border-[var(--accent)]"
      />

      {/* Match indicator */}
      <span className="whitespace-nowrap text-[11px] font-medium text-[var(--app-text-secondary)]">
        {totalMatches > 0
          ? `${activeMatchIndex} من ${totalMatches}`
          : searchTerm
            ? 'لا توجد نتائج'
            : ''}
      </span>

      {/* Navigation Buttons */}
      <button
        type="button"
        onClick={onPrev}
        disabled={totalMatches === 0}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] disabled:opacity-30"
        title="الرسالة السابقة (Shift + Enter)"
      >
        <ChevronUp size={16} />
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={totalMatches === 0}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] disabled:opacity-30"
        title="الرسالة التالية (Enter)"
      >
        <ChevronDown size={16} />
      </button>

      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-rose-500"
        title="إغلاق البحث (Esc)"
      >
        <X size={15} />
      </button>
    </div>
  );
};
