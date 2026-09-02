import React, { useRef, useEffect } from 'react';
import { Loader2, Box } from 'lucide-react';
import { cn } from '../../core/utils';

export interface SearchDropdownProps {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  emptyMessage?: string;
  hasResults?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Ref to the trigger element; click outside of both trigger and dropdown will close */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  open,
  onClose,
  loading = false,
  emptyMessage = 'لا توجد نتائج مطابقة',
  hasResults = false,
  children,
  className,
  triggerRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdownEl = dropdownRef.current;
      const triggerEl = triggerRef?.current;

      if (dropdownEl && !dropdownEl.contains(target) && !triggerEl?.contains(target)) {
        onClose();
      }
    };

    // Escape key handler
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'animate-in fade-in slide-in-from-top-2 absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl duration-200',
        className
      )}
    >
      {loading && (
        <div className="bg-slate-50/50 p-6 text-center dark:bg-slate-800/50">
          <Loader2 size={24} className="mb-2 inline-block animate-spin text-blue-500" />
          <div className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
            جاري البحث...
          </div>
        </div>
      )}

      {!loading && !hasResults && (
        <div className="bg-gray-50 p-8 text-center dark:bg-slate-950">
          <Box size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-xs font-bold text-gray-400">{emptyMessage}</p>
        </div>
      )}

      {!loading && hasResults && children}
    </div>
  );
};

export default SearchDropdown;
