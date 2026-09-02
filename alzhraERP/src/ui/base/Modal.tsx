import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon, Expand, Shrink } from 'lucide-react';
import { cn } from '../../core/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | 'resizable';
  /** Optional override for the overlay z-index (e.g. when stacking a modal above a fullscreen modal). */
  zIndex?: string;
  /** Hide the draggable header row entirely (caller renders its own header inside the body). */
  hideHeader?: boolean;
}

interface Position {
  x: number;
  y: number;
}
interface Size {
  width: number | string;
  height: number | string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  icon: Icon,
  title,
  description = '',
  children,
  footer,
  size = 'lg',
  zIndex,
  hideHeader = false,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [customSize, setCustomSize] = useState<Size | null>(null);

  const titleId = `modal-title-${title.replace(/\s/g, '-')}`;
  const descId = `modal-desc-${title.replace(/\s/g, '-')}`;
  const modalRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const resizeRef = useRef<{
    isResizing: boolean;
    direction: string;
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition(null);
      setCustomSize(null);
      setIsMaximized(size === 'full');
    }
  }, [isOpen, size]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };

    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!dragRef.current?.isDragging) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    setPosition({
      x: dragRef.current.initialX + deltaX,
      y: dragRef.current.initialY + deltaY,
    });
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    if (isMaximized) return;

    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;

    resizeRef.current = {
      isResizing: true,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: rect.width,
      initialHeight: rect.height,
      initialX: rect.left,
      initialY: rect.top,
    };

    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeRef.current?.isResizing) return;
    const { direction, startX, startY, initialWidth, initialHeight, initialX, initialY } =
      resizeRef.current;

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newX = position?.x ?? initialX;
    let newY = position?.y ?? initialY;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (direction.includes('e')) newWidth = Math.max(320, initialWidth + deltaX);
    if (direction.includes('s')) newHeight = Math.max(200, initialHeight + deltaY);

    if (direction.includes('w')) {
      const addedWidth = -deltaX;
      if (initialWidth + addedWidth >= 320) {
        newWidth = initialWidth + addedWidth;
        newX = initialX + deltaX;
      }
    }

    if (direction.includes('n')) {
      const addedHeight = -deltaY;
      if (initialHeight + addedHeight >= 200) {
        newHeight = initialHeight + addedHeight;
        newY = initialY + deltaY;
      }
    }

    setCustomSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  };

  const handleResizeEnd = () => {
    resizeRef.current = null;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'md:max-w-lg',
    md: 'md:max-w-2xl',
    lg: 'md:max-w-4xl',
    xl: 'md:max-w-5xl',
    '2xl': 'md:max-w-6xl',
    '3xl': 'md:max-w-7xl',
    '4xl': 'md:max-w-[85vw]',
    '5xl': 'md:max-w-[90vw]',
    full: 'md:max-w-[100vw] md:h-full md:rounded-none',
  };

  const toggleFullscreen = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      setPosition(null);
      setCustomSize(null);
    }
  };

  const modalStyle: React.CSSProperties = isMaximized
    ? {
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
      }
    : {
        ...(position
          ? {
              position: 'fixed',
              left: position.x,
              top: position.y,
              margin: 0,
              transform: 'none',
            }
          : {}),
        ...(customSize
          ? {
              width: customSize.width,
              height: customSize.height,
              maxWidth: '98vw',
              maxHeight: '98vh',
            }
          : {}),
      };

  return createPortal(
    <div
      className={cn(
        'animate-in fade-in fixed inset-0 flex items-end justify-center p-0 transition-all duration-300 md:items-center md:p-4',
        zIndex ?? (isMaximized || size === 'full' ? 'z-[9999]' : 'z-[100]'),
        !isMaximized && 'bg-slate-950/40 backdrop-blur-[2px]'
      )}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={e => {
          e.stopPropagation();
        }}
        style={modalStyle}
        className={cn(
          'animate-in flex w-full flex-col border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl transition-shadow duration-300',
          !position && sizeClasses[isMaximized ? 'full' : size === 'resizable' ? 'lg' : size],
          !isMaximized && 'md:zoom-in-95 max-h-[95vh] rounded-t-2xl md:max-h-[85vh] md:rounded-2xl',
          isMaximized && 'rounded-none'
        )}
      >
        {/* Multi-directional Resize Handles (Desktop Only) */}
        {!isMaximized && (
          <>
            <div
              onMouseDown={e => {
                handleResizeStart(e, 'n');
              }}
              className="absolute left-0 right-0 top-0 z-50 hidden h-1 cursor-ns-resize hover:bg-blue-500/20 md:block"
            />
            <div
              onMouseDown={e => {
                handleResizeStart(e, 's');
              }}
              className="absolute bottom-0 left-0 right-0 z-50 hidden h-1 cursor-ns-resize hover:bg-blue-500/20 md:block"
            />
            <div
              onMouseDown={e => {
                handleResizeStart(e, 'e');
              }}
              className="absolute bottom-0 right-0 top-0 z-50 hidden w-1 cursor-ew-resize hover:bg-blue-500/20 md:block"
            />
            <div
              onMouseDown={e => {
                handleResizeStart(e, 'w');
              }}
              className="absolute bottom-0 left-0 top-0 z-50 hidden w-1 cursor-ew-resize hover:bg-blue-500/20 md:block"
            />
            <div
              onMouseDown={e => {
                handleResizeStart(e, 'nw');
              }}
              className="absolute left-0 top-0 z-[60] hidden h-3 w-3 cursor-nwse-resize hover:bg-blue-500/40 md:block"
            />
            <div
              onMouseDown={e => {
                handleResizeStart(e, 'ne');
              }}
              className="absolute right-0 top-0 z-[60] hidden h-3 w-3 cursor-nesw-resize hover:bg-blue-500/40 md:block"
            />
            <div
              onMouseDown={e => {
                handleResizeStart(e, 'sw');
              }}
              className="absolute bottom-0 left-0 z-[60] hidden h-3 w-3 cursor-nesw-resize hover:bg-blue-500/40 md:block"
            />
            <div
              onMouseDown={e => {
                handleResizeStart(e, 'se');
              }}
              className="absolute bottom-0 right-0 z-[60] hidden h-3 w-3 cursor-nwse-resize hover:bg-blue-500/40 md:block"
            />
          </>
        )}

        {/* Header - Draggable Area */}
        {!hideHeader && (
          <div
            onMouseDown={handleDragStart}
            className={cn(
              'flex shrink-0 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] p-3 md:p-5',
              !isMaximized && 'cursor-move active:cursor-grabbing'
            )}
          >
            <div className="flex select-none items-center gap-2">
              {Icon && (
                <div className="rounded-md bg-blue-600 p-1.5 text-white shadow-sm md:rounded-lg md:p-2">
                  <Icon size={16} className="md:hidden" />
                  <Icon size={20} className="hidden md:block" />
                </div>
              )}
              <div>
                <h2
                  id={titleId}
                  className="text-[11px] font-bold leading-none text-[var(--app-text)] md:text-sm"
                >
                  {title}
                </h2>
                {description && (
                  <p
                    id={descId}
                    className="mt-1 text-[10px] font-medium text-[var(--app-text-secondary)] opacity-70 md:text-xs"
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-500 active:scale-90 dark:hover:bg-blue-900/20"
                title={isMaximized ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
              >
                {isMaximized ? <Shrink size={18} /> : <Expand size={18} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--app-text-secondary)] transition-all hover:text-red-500 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Content Segment */}
        <div
          className={cn(
            'custom-scrollbar flex-1 overflow-y-auto bg-[var(--app-bg)]',
            isMaximized || size === 'full' ? 'p-1 md:p-2 lg:p-3' : 'p-2.5 sm:p-5 md:p-6 lg:p-8'
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-t border-[var(--app-border)] bg-[var(--app-bg)] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:gap-2 sm:p-3 md:p-4 md:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
