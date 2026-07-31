import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LucideIcon, Expand, Shrink } from 'lucide-react';
import { cn } from '../../core/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | 'resizable';
}

type Position = { x: number; y: number };
type Size = { width: number | string; height: number | string };

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  icon: Icon,
  title,
  description,
  children,
  footer,
  size = 'lg'
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [customSize, setCustomSize] = useState<Size | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const resizeRef = useRef<{ isResizing: boolean; direction: string; startX: number; startY: number; initialWidth: number; initialHeight: number; initialX: number; initialY: number } | null>(null);

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
      initialY: rect.top
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
      y: dragRef.current.initialY + deltaY
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
      initialY: rect.top
    };

    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeRef.current?.isResizing) return;
    const { direction, startX, startY, initialWidth, initialHeight, initialX, initialY } = resizeRef.current;
    
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
    full: 'md:max-w-[100vw] md:h-full md:rounded-none'
  };

  const toggleFullscreen = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      setPosition(null);
      setCustomSize(null);
    }
  };

  const modalStyle: React.CSSProperties = isMaximized ? {
    width: '100vw',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999
  } : {
    ...(position ? { 
      position: 'fixed', 
      left: position.x, 
      top: position.y, 
      margin: 0,
      transform: 'none'
    } : {}),
    ...(customSize ? {
      width: customSize.width,
      height: customSize.height,
      maxWidth: '98vw',
      maxHeight: '98vh'
    } : {})
  };

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4 transition-all duration-300 animate-in fade-in",
        (isMaximized || size === 'full') ? "z-[9999]" : "z-[100]",
        !isMaximized && "bg-slate-950/40 backdrop-blur-[2px]"
      )}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        style={modalStyle}
        className={cn(
          "bg-[var(--app-surface)] w-full shadow-2xl flex flex-col animate-in duration-300 transition-shadow border border-[var(--app-border)]",
          !position && sizeClasses[isMaximized ? 'full' : (size === 'resizable' ? 'lg' : size as keyof typeof sizeClasses)],
          !isMaximized && "max-h-[95vh] rounded-t-2xl md:rounded-2xl md:max-h-[85vh] md:zoom-in-95",
          isMaximized && "rounded-none"
        )}
      >
        {/* Multi-directional Resize Handles (Desktop Only) */}
        {!isMaximized && (
          <>
            <div onMouseDown={(e) => handleResizeStart(e, 'n')} className="hidden md:block absolute top-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-blue-500/20" />
            <div onMouseDown={(e) => handleResizeStart(e, 's')} className="hidden md:block absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-blue-500/20" />
            <div onMouseDown={(e) => handleResizeStart(e, 'e')} className="hidden md:block absolute top-0 bottom-0 right-0 w-1 cursor-ew-resize z-50 hover:bg-blue-500/20" />
            <div onMouseDown={(e) => handleResizeStart(e, 'w')} className="hidden md:block absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize z-50 hover:bg-blue-500/20" />
            <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="hidden md:block absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-[60] hover:bg-blue-500/40" />
            <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="hidden md:block absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-[60] hover:bg-blue-500/40" />
            <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="hidden md:block absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-[60] hover:bg-blue-500/40" />
            <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="hidden md:block absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-[60] hover:bg-blue-500/40" />
          </>
        )}

        {/* Header - Draggable Area */}
        <div 
          onMouseDown={handleDragStart}
          className={cn(
            "flex justify-between items-center p-3 md:p-5 border-b border-[var(--app-border)] bg-[var(--app-surface)] shrink-0",
            !isMaximized && "cursor-move active:cursor-grabbing"
          )}
        >
          <div className="flex items-center gap-2 select-none">
            <div className="p-1.5 md:p-2 bg-blue-600 text-white shadow-sm rounded-md md:rounded-lg">
              <Icon size={16} className="md:hidden" />
              <Icon size={20} className="hidden md:block" />
            </div>
            <div>
              <h2 className="text-[11px] md:text-sm font-bold text-[var(--app-text)] leading-none">{title}</h2>
              <p className="text-[10px] md:text-xs font-medium text-[var(--app-text-secondary)] mt-1 opacity-70">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-90 transition-all rounded-lg"
              title={isMaximized ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
            >
              {isMaximized ? <Shrink size={18} /> : <Expand size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[var(--app-text-secondary)] hover:text-red-500 active:scale-90 transition-all rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Segment */}
        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar bg-[var(--app-bg)]",
          (isMaximized || size === 'full') ? "p-1 md:p-2 lg:p-3" : "p-4 md:p-8 lg:p-10"
        )}>
          {children}
        </div>

        {/* Footer */}
        <div className="p-2 md:p-4 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex gap-1 md:gap-2 shrink-0">
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;