import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../core/utils';
import { Minimize2 } from 'lucide-react';

interface FullscreenContainerProps {
  children: React.ReactNode;
  isMaximized: boolean;
  onToggleMaximize?: () => void;
  className?: string;
  isZenMode?: boolean;
}

const FullscreenContainer: React.FC<FullscreenContainerProps> = ({
  children,
  isMaximized,
  onToggleMaximize,
  className,
  isZenMode = false
}) => {
  useEffect(() => {
    if (!isMaximized) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onToggleMaximize) {
        onToggleMaximize();
      }
    };

    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isMaximized, onToggleMaximize]);

  if (!isMaximized) {
    return <>{children}</>;
  }

  return createPortal(
    <div className={cn(
      "fixed inset-0 z-[9999] bg-[var(--app-bg)] flex flex-col animate-in fade-in zoom-in-95 duration-500",
      className
    )}>
      {/* Floating Controls */}
      {onToggleMaximize && (
        <div className="absolute top-4 right-4 z-[10000] flex gap-2">
            <button
              onClick={onToggleMaximize}
              className="w-12 h-12 flex items-center justify-center bg-gray-900/80 hover:bg-gray-900 text-white rounded-full shadow-2xl backdrop-blur-md border border-white/10 transition-all active:scale-90 animate-in slide-in-from-top-4 hover:scale-105"
              title="Exit Full Screen / Minimize"
            >
              <Minimize2 size={24} />
            </button>
        </div>
      )}
      
      <div className={cn(
        "flex-1 flex flex-col min-h-0",
        isZenMode ? "p-0" : "pt-0"
      )}>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default FullscreenContainer;
