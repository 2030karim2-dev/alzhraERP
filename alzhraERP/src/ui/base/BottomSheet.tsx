
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../core/utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: '25%' | '50%' | '75%' | '90%';
  showHandle?: boolean;
}

const heightMap: Record<string, string> = {
  '25%': 'h-[25dvh]',
  '50%': 'h-[50dvh]',
  '75%': 'h-[75dvh]',
  '90%': 'h-[90dvh]',
};

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = '50%',
  showHandle = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchMoveY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
      return;
    }
    const timer = setTimeout(() => { setIsAnimating(false); }, 300);
    document.body.style.overflow = '';
    return () => { clearTimeout(timer); };
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleTouchStart = (e: React.TouchEvent): void => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    touchMoveY.current = e.touches[0].clientY;
    const delta = touchMoveY.current - touchStartY.current;
    if (delta > 80) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'قائمة الإجراءات'}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={(e) => { e.stopPropagation(); }}
        className={cn(
          'relative w-full bg-[var(--app-surface)] shadow-2xl flex flex-col transition-transform duration-300 ease-out rounded-t-2xl border-t border-[var(--app-border)]',
          heightMap[height] || 'h-[50dvh]',
          isOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-[var(--app-border)]" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--app-border)]">
            <h3 className="text-sm font-bold text-[var(--app-text)]">{title}</h3>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="p-1.5 rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default BottomSheet;
