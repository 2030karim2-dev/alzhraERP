import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../../core/utils';

interface FocusViewProps {
  children: React.ReactNode;
  className?: string;
}

const FocusView: React.FC<FocusViewProps> = ({ children, className }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn('relative', className)}>
      {/* Focus Toggle */}
      <button
        onClick={() => setIsFocused(!isFocused)}
        className={cn(
          'absolute top-2 right-2 z-10   max-md:p-2 rounded-xl transition-all duration-200',
          isFocused
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]',
        )}
        title={isFocused ? 'خروج من وضع التركيز' : 'وضع التركيز'}
        aria-label={isFocused ? 'خروج من وضع التركيز' : 'تفعيل وضع التركيز'}
      >
        {isFocused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      {/* Content */}
      {isFocused ? (
        <div className="fixed inset-0 z-[100] bg-[var(--app-bg)] overflow-y-auto custom-scrollbar animate-in zoom-in-95 fade-in duration-300">
          <div className="max-w-4xl mx-auto   max-md:p-4 md:p-8">
            <button
              onClick={() => setIsFocused(false)}
              className="mb-4 px-4 py-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl text-sm font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-colors"
            >
              ← رجوع
            </button>
            <div className="text-2xl max-md:text-lg md:text-4xl font-black">
              {children}
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default FocusView;
